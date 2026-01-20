import User from "../models/User.js";
import Order from "../models/Order.js";
import Reference from "../models/Reference.js";

/**
 * Pre-assign an investor to an order when it's created
 * This sets the expected investor but doesn't add profit yet (pending until delivered)
 * @param {Object} order - The order document  
 * @param {String} ownerId - The workspace owner ID
 * @param {Number} orderTotal - The order total for profit calculation
 * @returns {Object|null} The investor info or null if none eligible
 */
export async function preAssignInvestorToOrder(order, ownerId, orderTotal) {
  try {
    if (!order || !ownerId) return null;

    // Find the first active investor for this workspace (FIFO by createdAt)
    const investor = await User.findOne({
      role: "investor",
      createdBy: ownerId,
      "investorProfile.status": "active",
    }).sort({ createdAt: 1 });

    if (!investor) {
      return null;
    }

    const profile = investor.investorProfile || {};
    const profitPercentage = Number(profile.profitPercentage || 0);

    if (profitPercentage <= 0) {
      return null;
    }

    // Calculate expected profit for this order
    const total = Number(orderTotal || order.total || 0);
    const expectedProfit = Math.round((total * profitPercentage / 100) * 100) / 100;

    // Set investor info on order (pending until delivered)
    order.investorProfit = {
      investor: investor._id,
      investorName: `${investor.firstName || ''} ${investor.lastName || ''}`.trim() || investor.email,
      profitPercentage,
      profitAmount: expectedProfit,
      isPending: true,
      assignedAt: new Date(),
    };

    console.log(`[InvestorProfit] Pre-assigned investor ${investor.email} to order (${expectedProfit} pending)`);
    return {
      investorId: investor._id,
      investorName: order.investorProfit.investorName,
      profitPercentage,
      expectedProfit,
    };
  } catch (error) {
    console.error("[InvestorProfit] Error pre-assigning investor:", error);
    return null;
  }
}

/**
 * Finalize investor profit when order is delivered
 * Updates investor's earnedProfit and marks order profit as no longer pending
 * @param {Object} order - The order document
 * @param {String} ownerId - The workspace owner ID
 * @returns {Object|null} The updated investor or null if none eligible
 */
export async function finalizeInvestorProfit(order, ownerId) {
  try {
    if (!order || !ownerId) return null;

    // Check if order already has an assigned investor
    let investorId = order.investorProfit?.investor;
    let profitAmount = order.investorProfit?.profitAmount || 0;

    // If no investor pre-assigned, try to assign one now
    if (!investorId) {
      const preAssigned = await preAssignInvestorToOrder(order, ownerId, order.total);
      if (!preAssigned) return null;
      investorId = preAssigned.investorId;
      profitAmount = preAssigned.expectedProfit;
    }

    // Get investor
    const investor = await User.findById(investorId);
    if (!investor || investor.investorProfile?.status !== "active") {
      console.log("[InvestorProfit] Investor not found or not active");
      return null;
    }

    const profile = investor.investorProfile || {};
    const profitTarget = Number(profile.profitAmount || 0);
    const currentEarned = Number(profile.earnedProfit || 0);

    // Recalculate profit if needed
    if (profitAmount <= 0) {
      const profitPercentage = Number(profile.profitPercentage || 0);
      profitAmount = Math.round((Number(order.total || 0) * profitPercentage / 100) * 100) / 100;
    }

    if (profitAmount <= 0) return null;

    // Calculate reference profit deduction from investor amount
    let referenceDeduction = 0;
    try {
      const references = await Reference.find({ userId: ownerId });
      if (references && references.length > 0) {
        for (const ref of references) {
          const refRate = Number(ref.profitRate || 0);
          if (refRate > 0) {
            const refProfit = Math.round((profitAmount * refRate / 100) * 100) / 100;
            referenceDeduction += refProfit;
            // Update reference's total and pending profit
            ref.totalProfit = (ref.totalProfit || 0) + refProfit;
            ref.pendingAmount = (ref.pendingAmount || 0) + refProfit;
            await ref.save();
            console.log(`[InvestorProfit] Reference ${ref.name} earned ${refProfit} (${refRate}% of investor profit)`);
          }
        }
      }
    } catch (refErr) {
      console.error("[InvestorProfit] Error calculating reference profit:", refErr);
    }

    // Update investor's earned profit (after reference deduction)
    const netProfitAmount = profitAmount - referenceDeduction;
    const newEarned = currentEarned + netProfitAmount;
    investor.investorProfile.earnedProfit = newEarned;
    investor.investorProfile.totalReturn = Number(profile.investmentAmount || 0) + newEarned;

    // Check if profit target reached
    if (profitTarget > 0 && newEarned >= profitTarget) {
      investor.investorProfile.status = "completed";
      investor.investorProfile.completedAt = new Date();
      console.log(`[InvestorProfit] Investor ${investor.email} completed profit target!`);
    }

    investor.markModified("investorProfile");
    await investor.save();

    // Update order to mark profit as finalized
    order.investorProfit.isPending = false;
    order.investorProfit.profitAmount = profitAmount;
    await order.save();

    console.log(`[InvestorProfit] Finalized ${profitAmount} profit to investor ${investor.email}`);
    return investor;
  } catch (error) {
    console.error("[InvestorProfit] Error finalizing profit:", error);
    return null;
  }
}

// Keep old function name for backwards compatibility
export const assignInvestorProfitToOrder = finalizeInvestorProfit;

/**
 * Get profit statistics for an investor
 * @param {String} investorId
 * @returns {Object} Stats object with orders count, total profit, etc.
 */
export async function getInvestorProfitStats(investorId) {
  try {
    const orders = await Order.find({
      "investorProfit.investor": investorId,
    }).select("total investorProfit createdAt shipmentStatus").lean();

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.shipmentStatus === "delivered");
    const totalProfit = deliveredOrders.reduce((sum, o) => sum + (o.investorProfit?.profitAmount || 0), 0);
    const pendingProfit = orders.filter(o => o.investorProfit?.isPending).reduce((sum, o) => sum + (o.investorProfit?.profitAmount || 0), 0);

    return {
      totalOrders,
      deliveredOrders: deliveredOrders.length,
      totalProfit,
      pendingProfit,
      orders: orders.slice(-10), // Last 10 orders
    };
  } catch (error) {
    console.error("[InvestorProfit] Error getting stats:", error);
    return { totalOrders: 0, deliveredOrders: 0, totalProfit: 0, pendingProfit: 0, orders: [] };
  }
}

