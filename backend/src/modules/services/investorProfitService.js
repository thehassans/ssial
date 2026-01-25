import User from "../models/User.js";
import Order from "../models/Order.js";
import Reference from "../models/Reference.js";

async function getWorkspaceNetFactor(ownerId) {
  try {
    const refs = await Reference.find({ userId: ownerId }).select("profitRate").lean();
    const totalRate = (refs || []).reduce((sum, r) => sum + Number(r?.profitRate || 0), 0);
    const factor = 1 - totalRate / 100;
    return factor > 0 ? factor : 0;
  } catch {
    return 1;
  }
}

async function getPendingGrossProfitMap(investorIds) {
  const ids = Array.isArray(investorIds) ? investorIds.filter(Boolean) : [];
  if (ids.length === 0) return new Map();
  const rows = await Order.aggregate([
    {
      $match: {
        "investorProfit.investor": { $in: ids },
        "investorProfit.isPending": true,
      },
    },
    { $group: { _id: "$investorProfit.investor", pending: { $sum: "$investorProfit.profitAmount" } } },
  ]);
  const map = new Map();
  for (const r of rows || []) map.set(String(r._id), Number(r?.pending || 0));
  return map;
}

async function pickEligibleInvestor(ownerId) {
  const investors = await User.find({
    role: "investor",
    createdBy: ownerId,
    "investorProfile.status": "active",
  })
    .select("firstName lastName email investorProfile createdAt")
    .sort({ createdAt: 1 })
    .lean();

  if (!investors || investors.length === 0) return null;
  const netFactor = await getWorkspaceNetFactor(ownerId);
  const pendingMap = await getPendingGrossProfitMap(investors.map((i) => i._id));

  for (const inv of investors) {
    const profile = inv?.investorProfile || {};
    const target = Number(profile.profitAmount || 0);
    const earned = Number(profile.earnedProfit || 0);
    const pendingGross = Number(pendingMap.get(String(inv._id)) || 0);
    const pendingNet = pendingGross * netFactor;
    const remainingNet = target > 0 ? target - earned - pendingNet : Infinity;
    if (remainingNet > 0 && Number(profile.profitPercentage || 0) > 0) {
      return { investor: inv, remainingNet, netFactor };
    }
  }

  return null;
}

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

    if (order.investorProfit?.investor) {
      const existing = order.investorProfit || {};
      return {
        investorId: existing.investor,
        investorName: existing.investorName,
        profitPercentage: Number(existing.profitPercentage || 0),
        expectedProfit: Number(existing.profitAmount || 0),
      };
    }

    const picked = await pickEligibleInvestor(ownerId);
    if (!picked?.investor) return null;

    const investor = picked.investor;
    const remainingNet = Number(picked.remainingNet || 0);
    const netFactor = Number(picked.netFactor || 1);

    const profile = investor.investorProfile || {};
    const profitPercentage = Number(profile.profitPercentage || 0);

    if (profitPercentage <= 0) {
      return null;
    }

    if (!Number.isFinite(netFactor) || netFactor <= 0) {
      return null;
    }

    // Calculate expected profit for this order
    const total = Number(orderTotal || order.total || 0);
    let expectedProfit = Math.round((total * profitPercentage / 100) * 100) / 100;
    if (Number.isFinite(remainingNet) && remainingNet > 0) {
      const maxGross = remainingNet / netFactor;
      if (Number.isFinite(maxGross) && maxGross > 0) {
        expectedProfit = Math.min(expectedProfit, maxGross);
        expectedProfit = Math.round(expectedProfit * 100) / 100;
      }
    }

    if (!Number.isFinite(expectedProfit) || expectedProfit <= 0) return null;

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

    if (order.investorProfit?.investor && order.investorProfit?.isPending === false) {
      return null;
    }

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
    if (!investor) {
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

    // Clamp profit to remaining target (net of reference deduction)
    const netFactor = await getWorkspaceNetFactor(ownerId);
    const remainingNet = profitTarget > 0 ? profitTarget - currentEarned : Infinity;
    if (profitTarget > 0 && remainingNet <= 0) {
      if (order.investorProfit) {
        order.investorProfit.isPending = false;
        order.investorProfit.profitAmount = 0;
        await order.save();
      }
      return investor;
    }
    if (profitTarget > 0 && Number.isFinite(netFactor) && netFactor > 0) {
      const maxGross = remainingNet / netFactor;
      if (Number.isFinite(maxGross) && maxGross > 0) {
        profitAmount = Math.min(profitAmount, maxGross);
        profitAmount = Math.round(profitAmount * 100) / 100;
      }
    }

    if (profitAmount <= 0) {
      if (order.investorProfit) {
        order.investorProfit.isPending = false;
        order.investorProfit.profitAmount = 0;
        await order.save();
      }
      return investor;
    }

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

