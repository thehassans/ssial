import express from "express";
import mongoose from "mongoose";
import WebOrder from "../models/WebOrder.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { getIO } from "../config/socket.js";
import { sendOrderConfirmationEmail } from "../services/emailService.js";

const ObjectId = mongoose.Types.ObjectId;

const router = express.Router();

// Helper: emit new web order notification
function emitNewWebOrder(order) {
  try {
    const io = getIO();
    // Notify admin/user panel (online orders)
    io.emit("weborder.new", { order });
    // Notify customer if logged in
    if (order.customerId) {
      io.to(`user:${String(order.customerId)}`).emit("customer.order.new", { order });
    }
  } catch (err) {
    console.error("Socket emit error:", err);
  }
}

// POST /api/ecommerce/orders (public)
router.post("/orders", async (req, res) => {
  try {
    const {
      customerName = "",
      customerPhone = "",
      altPhone = "",
      phoneCountryCode = "",
      orderCountry = "",
      city = "",
      area = "",
      address = "",
      details = "",
      items = [],
      currency = "SAR",
      customerId = null, // Optional: if customer is logged in
      locationLat = null,
      locationLng = null,
      paymentMethod = 'cod',
      paymentStatus = 'pending',
    } = req.body || {};

    if (!customerName.trim())
      return res.status(400).json({ message: "Name is required" });
    if (!customerPhone.trim())
      return res.status(400).json({ message: "Phone is required" });
    if (!orderCountry.trim())
      return res.status(400).json({ message: "Country is required" });
    if (!city.trim())
      return res.status(400).json({ message: "City is required" });
    if (!address.trim())
      return res.status(400).json({ message: "Address is required" });

    // Normalize items
    const norm = Array.isArray(items) ? items : [];
    if (norm.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    const ids = norm.map((i) => i && i.productId).filter(Boolean);
    const prods = await Product.find({
      _id: { $in: ids },
      displayOnWebsite: true,
    });
    const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
    
    // Get currency rates for conversion
    const Setting = (await import("../models/Setting.js")).default;
    const currencyDoc = await Setting.findOne({ key: "currency" }).lean();
    const defaultRates = { SAR: 1, AED: 1.02, GBP: 4.75, EUR: 4.05, USD: 3.75, OMR: 9.78, BHD: 9.94, KWD: 12.2, QAR: 1.03, INR: 0.046, PKR: 0.013 };
    const sarPerUnit = (currencyDoc?.value?.sarPerUnit) || defaultRates;
    
    // Convert price from product base currency to order currency
    const convertPrice = (price, fromCurrency, toCurrency) => {
      if (fromCurrency === toCurrency) return price;
      const fromRate = sarPerUnit[fromCurrency] || 1;
      const toRate = sarPerUnit[toCurrency] || 1;
      // Convert: price in fromCurrency -> SAR -> toCurrency
      const priceInSar = price * fromRate;
      return priceInSar / toRate;
    };
    
    let total = 0;
    const orderItems = [];
    for (const it of norm) {
      const p = byId[String(it.productId)];
      if (!p)
        return res
          .status(400)
          .json({ message: "One or more products not available" });
      const qty = Math.max(1, Number(it.quantity || 1));
      // Use salePrice if available and less than regular price
      const hasSale = p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price);
      const basePrice = hasSale ? Number(p.salePrice) : Number(p.price || 0);
      const baseCurrency = p.baseCurrency || 'SAR';
      // Convert to order currency
      const unit = convertPrice(basePrice, baseCurrency, currency);
      total += unit * qty;
      orderItems.push({
        productId: p._id,
        name: p.name || "",
        price: Number(unit.toFixed(2)),
        quantity: qty,
      });
    }

    // Apply coupon discount if provided
    const couponCode = req.body.couponCode || null;
    const couponDiscount = Number(req.body.couponDiscount || 0);
    const subtotal = Math.max(0, Number(total || 0));
    const finalTotal = Math.max(0, subtotal - couponDiscount);

    const doc = new WebOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      altPhone: String(altPhone || "").trim(),
      phoneCountryCode: String(phoneCountryCode || "").trim(),
      orderCountry: orderCountry.trim(),
      city: city.trim(),
      area: String(area || "").trim(),
      address: address.trim(),
      details: String(details || "").trim(),
      customerId: customerId && mongoose.isValidObjectId(customerId) ? new ObjectId(customerId) : null,
      items: orderItems,
      subtotal: subtotal,
      total: finalTotal,
      couponCode: couponCode,
      couponDiscount: couponDiscount,
      currency: String(currency || "SAR"),
      status: "new",
      locationLat: locationLat ? Number(locationLat) : null,
      locationLng: locationLng ? Number(locationLng) : null,
      paymentMethod: String(paymentMethod || "cod"),
      paymentStatus: String(paymentStatus || "pending"),
    });
    await doc.save();
    
    // Emit real-time notification
    emitNewWebOrder(doc);
    
    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(doc).catch(err => console.error('Email send error:', err));
    
    return res.status(201).json({ message: "Order received", order: doc });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to submit order", error: err?.message });
  }
});

// POST /api/ecommerce/customer/orders - Create order for logged-in customer
router.post(
  "/customer/orders",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customerId = req.user.id;
      const customer = await User.findById(customerId).select("firstName lastName phone email").lean();
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const {
        address = "",
        city = "",
        area = "",
        orderCountry = "",
        details = "",
        items = [],
        currency = "SAR",
        paymentMethod = "cod",
        paymentStatus = "pending",
        paymentId = null,
        paymentDetails = null,
        locationLat = null,
        locationLng = null,
        couponCode = null,
        couponDiscount = 0,
      } = req.body || {};

      if (!address.trim())
        return res.status(400).json({ message: "Address is required" });
      if (!city.trim())
        return res.status(400).json({ message: "City is required" });
      if (!orderCountry.trim())
        return res.status(400).json({ message: "Country is required" });

      const norm = Array.isArray(items) ? items : [];
      if (norm.length === 0)
        return res.status(400).json({ message: "Cart is empty" });

      const ids = norm.map((i) => i && i.productId).filter(Boolean);
      const prods = await Product.find({
        _id: { $in: ids },
        displayOnWebsite: true,
      });
      const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
      
      // Get currency rates for conversion
      const Setting = (await import("../models/Setting.js")).default;
      const currencyDoc = await Setting.findOne({ key: "currency" }).lean();
      const defaultRates = { SAR: 1, AED: 1.02, GBP: 4.75, EUR: 4.05, USD: 3.75, OMR: 9.78, BHD: 9.94, KWD: 12.2, QAR: 1.03, INR: 0.046, PKR: 0.013 };
      const sarPerUnit = (currencyDoc?.value?.sarPerUnit) || defaultRates;
      
      // Convert price from product base currency to order currency
      const convertPrice = (price, fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return price;
        const fromRate = sarPerUnit[fromCurrency] || 1;
        const toRate = sarPerUnit[toCurrency] || 1;
        const priceInSar = price * fromRate;
        return priceInSar / toRate;
      };
      
      let total = 0;
      const orderItems = [];
      for (const it of norm) {
        const p = byId[String(it.productId)];
        if (!p)
          return res.status(400).json({ message: "One or more products not available" });
        const qty = Math.max(1, Number(it.quantity || 1));
        // Use salePrice if available and less than regular price
        const hasSale = p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price);
        const basePrice = hasSale ? Number(p.salePrice) : Number(p.price || 0);
        const baseCurrency = p.baseCurrency || 'SAR';
        const unit = convertPrice(basePrice, baseCurrency, currency);
        total += unit * qty;
        orderItems.push({
          productId: p._id,
          name: p.name || "",
          price: Number(unit.toFixed(2)),
          quantity: qty,
        });
      }

      const subtotal = Math.max(0, Number(total || 0));
      const disc = Math.max(0, Number(couponDiscount || 0));
      const finalTotal = Math.max(0, subtotal - disc);

      const doc = new WebOrder({
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || "Customer",
        customerPhone: customer.phone || "",
        customerEmail: customer.email || "",
        customerId: customerId,
        orderCountry: orderCountry.trim(),
        city: city.trim(),
        area: String(area || "").trim(),
        address: address.trim(),
        details: String(details || "").trim(),
        items: orderItems,
        subtotal: subtotal,
        couponCode: couponCode ? String(couponCode) : null,
        couponDiscount: disc,
        total: finalTotal,
        currency: String(currency || "SAR"),
        status: "new",
        locationLat: locationLat ? Number(locationLat) : null,
        locationLng: locationLng ? Number(locationLng) : null,
        paymentMethod: String(paymentMethod || "cod"),
        paymentStatus: String(paymentStatus || "pending"),
        paymentId: paymentId || null,
        paymentDetails: paymentDetails || {},
      });
      doc.markModified('paymentDetails');
      await doc.save();
      
      // Emit real-time notification
      emitNewWebOrder(doc);
      
      // Send order confirmation email (non-blocking)
      sendOrderConfirmationEmail(doc).catch(err => console.error('Email send error:', err));
      
      return res.status(201).json({ message: "Order placed successfully", order: doc });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to submit order", 
        error: err?.message 
      });
    }
  }
);

// Distinct options: countries and cities for ecommerce orders
router.get(
  "/orders/options",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const countryParam = String(req.query.country || "").trim();
      const countriesRaw = (await WebOrder.distinct("orderCountry", {})).filter(
        Boolean
      );
      const countries = Array.from(new Set(countriesRaw)).sort();
      const matchCity = {};
      if (countryParam) matchCity.orderCountry = countryParam;
      const cities = (await WebOrder.distinct("city", matchCity))
        .filter(Boolean)
        .sort();
      return res.json({ countries, cities });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load options", error: err?.message });
    }
  }
);
// GET /api/ecommerce/orders (admin/user/manager)
router.get(
  "/orders",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const {
        q = "",
        status = "",
        start = "",
        end = "",
        product = "",
        ship = "",
        country = "",
        city = "",
        onlyUnassigned = "",
      } = req.query || {};
      const match = {};
      if (q) {
        const rx = new RegExp(
          String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        match.$or = [
          { customerName: rx },
          { customerPhone: rx },
          { address: rx },
          { city: rx },
          { area: rx },
          { details: rx },
          { "items.name": rx },
        ];
      }
      if (status) match.status = status;
      if (ship) match.shipmentStatus = ship;
      if (country) match.orderCountry = country;
      if (city) match.city = city;
      if (String(onlyUnassigned).toLowerCase() === "true")
        match.deliveryBoy = { $in: [null, undefined] };
      if (start || end) {
        match.createdAt = {};
        if (start) match.createdAt.$gte = new Date(start);
        if (end) match.createdAt.$lte = new Date(end);
      }
      if (product) {
        match["items.productId"] = product;
      }

      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;
      const total = await WebOrder.countDocuments(match);
      const rows = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("deliveryBoy", "firstName lastName email city");
      const hasMore = skip + rows.length < total;
      return res.json({ orders: rows, page, limit, total, hasMore });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load online orders", error: err?.message });
    }
  }
);

// GET /api/ecommerce/orders/export — export filtered orders as CSV
router.get(
  "/orders/export",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const {
        q = "",
        status = "",
        start = "",
        end = "",
        product = "",
        ship = "",
        country = "",
        city = "",
        onlyUnassigned = "",
      } = req.query || {};
      const match = {};
      if (q) {
        const rx = new RegExp(
          String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        match.$or = [
          { customerName: rx },
          { customerPhone: rx },
          { address: rx },
          { city: rx },
          { area: rx },
          { details: rx },
          { "items.name": rx },
        ];
      }
      if (status) match.status = status;
      if (ship) match.shipmentStatus = ship;
      if (country) match.orderCountry = country;
      if (city) match.city = city;
      if (String(onlyUnassigned).toLowerCase() === "true")
        match.deliveryBoy = { $in: [null, undefined] };
      if (start || end) {
        match.createdAt = {};
        if (start) match.createdAt.$gte = new Date(start);
        if (end) match.createdAt.$lte = new Date(end);
      }
      if (product) {
        match["items.productId"] = product;
      }

      const cap = Math.min(10000, Math.max(1, Number(req.query.max || 10000)));
      const rows = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(cap)
        .populate("deliveryBoy", "firstName lastName email city")
        .lean();

      const esc = (v) => {
        if (v == null) return "";
        const s = String(v);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const fmtDate = (d) => {
        try {
          return new Date(d).toISOString();
        } catch {
          return "";
        }
      };
      const itemsToText = (items) => {
        try {
          const arr = Array.isArray(items) ? items : [];
          return arr
            .map(
              (it) =>
                `${it?.name || ""} x${Math.max(
                  1,
                  Number(it?.quantity || 1)
                )}@${Number(it?.price || 0).toFixed(2)}`
            )
            .join("; ");
        } catch {
          return "";
        }
      };

      const header = [
        "OrderID",
        "CreatedAt",
        "Status",
        "ShipmentStatus",
        "Country",
        "City",
        "Area",
        "Address",
        "Customer",
        "PhoneCode",
        "Phone",
        "Currency",
        "Total",
        "Items",
        "ItemsCount",
        "DriverName",
        "DriverCity",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        const driverName = r?.deliveryBoy
          ? `${r.deliveryBoy.firstName || ""} ${
              r.deliveryBoy.lastName || ""
            }`.trim()
          : "";
        const itemsTxt = itemsToText(r?.items);
        const itemsCount = Array.isArray(r?.items)
          ? r.items.reduce(
              (s, it) => s + Math.max(1, Number(it?.quantity || 1)),
              0
            )
          : 0;
        const line = [
          esc(r?._id),
          esc(fmtDate(r?.createdAt)),
          esc(r?.status || ""),
          esc(r?.shipmentStatus || ""),
          esc(r?.orderCountry || ""),
          esc(r?.city || ""),
          esc(r?.area || ""),
          esc(r?.address || ""),
          esc(r?.customerName || ""),
          esc(r?.phoneCountryCode || ""),
          esc(r?.customerPhone || ""),
          esc(r?.currency || "SAR"),
          esc(Number(r?.total || 0).toFixed(2)),
          esc(itemsTxt),
          esc(itemsCount),
          esc(driverName),
          esc(r?.deliveryBoy?.city || ""),
        ].join(",");
        lines.push(line);
      }

      const csv = "\ufeff" + lines.join("\n");
      const ts = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="web-orders-${ts}.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to export orders", error: err?.message });
    }
  }
);

// PATCH /api/ecommerce/orders/:id (update status)
router.patch(
  "/orders/:id",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, shipmentStatus } = req.body || {};
      const allowed = ["new", "processing", "done", "cancelled"];
      if (status && !allowed.includes(String(status)))
        return res.status(400).json({ message: "Invalid status" });
      const allowedShip = [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "returned",
        "cancelled",
      ];
      if (shipmentStatus && !allowedShip.includes(String(shipmentStatus)))
        return res.status(400).json({ message: "Invalid shipment status" });
      const ord = await WebOrder.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });
      if (status) ord.status = status;
      if (shipmentStatus) ord.shipmentStatus = shipmentStatus;
      await ord.save();
      return res.json({ message: "Updated", order: ord });
    } catch (err) {
      return res
        .status(500)
        .json({
          message: "Failed to update online order",
          error: err?.message,
        });
    }
  }
);

// Assign driver to an online (web) order
router.post(
  "/orders/:id/assign-driver",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId } = req.body || {};
      if (!driverId)
        return res.status(400).json({ message: "driverId required" });
      const ord = await WebOrder.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });
      const driver = await User.findById(driverId);
      if (!driver || driver.role !== "driver")
        return res.status(400).json({ message: "Driver not found" });

      // Workspace scoping similar to /api/orders
      if (req.user.role === "user") {
        if (String(driver.createdBy) !== String(req.user.id))
          return res.status(403).json({ message: "Not allowed" });
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id).select(
          "createdBy assignedCountry"
        );
        const ownerId = String(mgr?.createdBy || "");
        if (!ownerId || String(driver.createdBy) !== ownerId)
          return res.status(403).json({ message: "Not allowed" });
        if (mgr?.assignedCountry) {
          if (driver.country && driver.country !== mgr.assignedCountry) {
            return res
              .status(403)
              .json({
                message: `Manager can only assign drivers from ${mgr.assignedCountry}`,
              });
          }
          if (ord.orderCountry && ord.orderCountry !== mgr.assignedCountry) {
            return res
              .status(403)
              .json({
                message: `Manager can only assign to orders from ${mgr.assignedCountry}`,
              });
          }
        }
      }

      // City rule: enforce order city matches driver city if provided
      if (
        driver.city &&
        ord.city &&
        String(driver.city).toLowerCase() !== String(ord.city).toLowerCase()
      ) {
        return res
          .status(400)
          .json({ message: "Driver city does not match order city" });
      }

      ord.deliveryBoy = driver._id;
      if (!ord.shipmentStatus || ord.shipmentStatus === "pending")
        ord.shipmentStatus = "assigned";
      await ord.save();
      await ord.populate("deliveryBoy", "firstName lastName email city");
      return res.json({ message: "Driver assigned", order: ord });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to assign driver", error: err?.message });
    }
  }
);

// ============================================
// CUSTOMER PORTAL ENDPOINTS
// ============================================

// GET /api/ecommerce/customer/orders - Get logged-in customer's orders
router.get(
  "/customer/orders",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customerId = req.user.id;
      const { status = "", page = 1, limit = 20 } = req.query || {};
      
      // Get customer details to match by phone/email for older orders
      const customer = await User.findById(customerId).select("phone email").lean();
      
      // Query by customerId OR by customer phone/email for backwards compatibility
      const matchConditions = [
        { customerId: customerId },
        { customerId: new ObjectId(customerId) }
      ];
      
      // Also match by phone or email for orders placed before customer linking was fixed
      if (customer?.phone) {
        matchConditions.push({ customerPhone: customer.phone });
      }
      if (customer?.email) {
        matchConditions.push({ customerEmail: customer.email });
      }
      
      const match = { $or: matchConditions };
      if (status) match.status = status;
      
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;
      
      const total = await WebOrder.countDocuments(match);
      const orders = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("deliveryBoy", "firstName lastName phone")
        .lean();
      
      const hasMore = skip + orders.length < total;
      
      return res.json({ orders, page: pageNum, limit: limitNum, total, hasMore });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load orders", 
        error: err?.message 
      });
    }
  }
);

// GET /api/ecommerce/customer/orders/:id - Get single order with tracking
router.get(
  "/customer/orders/:id",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const customerId = req.user.id;
      
      // Query both string and ObjectId for backwards compatibility
      const order = await WebOrder.findOne({ 
        _id: id, 
        $or: [
          { customerId: customerId },
          { customerId: new ObjectId(customerId) }
        ]
      })
        .populate("deliveryBoy", "firstName lastName phone")
        .lean();
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Build tracking timeline
      const timeline = [];
      timeline.push({
        status: "ordered",
        label: "Order Placed",
        date: order.createdAt,
        completed: true
      });
      
      if (order.status === "processing" || order.shipmentStatus !== "pending") {
        timeline.push({
          status: "processing",
          label: "Order Confirmed",
          date: order.updatedAt,
          completed: true
        });
      }
      
      if (order.shipmentStatus === "assigned" || order.deliveryBoy) {
        timeline.push({
          status: "assigned",
          label: "Driver Assigned",
          date: order.updatedAt,
          completed: true,
          driver: order.deliveryBoy ? {
            name: `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim(),
            phone: order.deliveryBoy.phone
          } : null
        });
      }
      
      if (order.shipmentStatus === "picked_up" || order.shipmentStatus === "in_transit") {
        timeline.push({
          status: "in_transit",
          label: "Out for Delivery",
          date: order.updatedAt,
          completed: true
        });
      }
      
      if (order.shipmentStatus === "delivered") {
        timeline.push({
          status: "delivered",
          label: "Delivered",
          date: order.updatedAt,
          completed: true
        });
      }
      
      return res.json({ order, timeline });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load order", 
        error: err?.message 
      });
    }
  }
);

// GET /api/ecommerce/customer/profile - Get customer profile
router.get(
  "/customer/profile",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customer = await User.findById(req.user.id)
        .select("-password")
        .lean();
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Get order stats - match by customerId OR phone/email for backwards compatibility
      const matchConditions = [
        { customerId: String(customer._id) },
        { customerId: customer._id }
      ];
      if (customer.phone) {
        matchConditions.push({ customerPhone: customer.phone });
      }
      if (customer.email) {
        matchConditions.push({ customerEmail: customer.email });
      }
      
      const orderStats = await WebOrder.aggregate([
        { $match: { $or: matchConditions } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            pendingOrders: {
              $sum: { $cond: [{ $in: ["$status", ["new", "processing"]] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0] }
            }
          }
        }
      ]);
      
      const stats = orderStats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        deliveredOrders: 0
      };
      
      return res.json({ customer, stats });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load profile", 
        error: err?.message 
      });
    }
  }
);

// ============ PAYMENT METHODS ============

// GET /api/ecommerce/customer/payment-methods - Get saved payment methods
router.get(
  "/customer/payment-methods",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customer = await User.findById(req.user.id).lean();
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Return saved payment methods from customer profile
      const methods = customer.paymentMethods || [];
      return res.json({ methods });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load payment methods", 
        error: err?.message 
      });
    }
  }
);

// POST /api/ecommerce/customer/payment-methods - Add a payment method
router.post(
  "/customer/payment-methods",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { type, token, last4, brand, expMonth, expYear } = req.body;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods) {
        customer.paymentMethods = [];
      }
      
      const newMethod = {
        id: new ObjectId().toString(),
        type: type || 'card',
        token: token || null,
        last4: last4 || '****',
        brand: brand || 'unknown',
        expMonth: expMonth || '',
        expYear: expYear || '',
        isDefault: customer.paymentMethods.length === 0,
        createdAt: new Date()
      };
      
      customer.paymentMethods.push(newMethod);
      await customer.save();
      
      return res.json({ message: "Payment method added", method: newMethod });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to add payment method", 
        error: err?.message 
      });
    }
  }
);

// POST /api/ecommerce/customer/payment-methods/:id/default - Set default payment method
router.post(
  "/customer/payment-methods/:id/default",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods || customer.paymentMethods.length === 0) {
        return res.status(404).json({ message: "No payment methods found" });
      }
      
      // Set all to non-default, then set the specified one as default
      customer.paymentMethods = customer.paymentMethods.map(m => ({
        ...m,
        isDefault: m.id === id
      }));
      
      await customer.save();
      return res.json({ message: "Default payment method updated" });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to update default", 
        error: err?.message 
      });
    }
  }
);

// DELETE /api/ecommerce/customer/payment-methods/:id - Remove a payment method
router.delete(
  "/customer/payment-methods/:id",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods) {
        return res.status(404).json({ message: "No payment methods found" });
      }
      
      customer.paymentMethods = customer.paymentMethods.filter(m => m.id !== id);
      await customer.save();
      
      return res.json({ message: "Payment method removed" });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to remove payment method", 
        error: err?.message 
      });
    }
  }
);

// ============ STRIPE PAYMENT ============

// POST /api/ecommerce/payments/stripe/create-intent - Create Stripe payment intent
router.post("/payments/stripe/create-intent", async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    // Dynamic import of Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      metadata: { orderId: orderId || '' }
    });
    
    return res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ 
      message: "Failed to create payment intent", 
      error: err?.message 
    });
  }
});

// POST /api/ecommerce/payments/stripe/process-card - Process card payment directly
router.post("/payments/stripe/process-card", async (req, res) => {
  try {
    const { amount, currency = 'usd', card } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    
    if (!card || !card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return res.status(400).json({ success: false, message: "Card details are required" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        success: false,
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    // Create a payment method from card details
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: card.number,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvc: card.cvc,
      },
      billing_details: {
        name: card.name || 'Customer',
      },
    });
    
    // Create and confirm payment intent in one step
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      return res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful'
      });
    } else {
      return res.json({ 
        success: false, 
        message: `Payment status: ${paymentIntent.status}. Please try again.`
      });
    }
  } catch (err) {
    console.error('Stripe card payment error:', err);
    // Handle specific Stripe errors
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ 
        success: false,
        message: err.message || 'Your card was declined'
      });
    }
    return res.status(500).json({ 
      success: false,
      message: err?.message || "Payment failed. Please try again."
    });
  }
});

// POST /api/ecommerce/payments/stripe/process-payment - Process payment with payment method ID (PCI compliant)
router.post("/payments/stripe/process-payment", async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentMethodId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: "Payment method ID is required" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        success: false,
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    // Create and confirm payment intent with payment method ID
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      return res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful'
      });
    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure authentication required
      return res.json({ 
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: 'Additional authentication required'
      });
    } else {
      return res.json({ 
        success: false, 
        message: `Payment status: ${paymentIntent.status}. Please try again.`
      });
    }
  } catch (err) {
    console.error('Stripe payment error:', err);
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ 
        success: false,
        message: err.message || 'Your card was declined'
      });
    }
    return res.status(500).json({ 
      success: false,
      message: err?.message || "Payment failed. Please try again."
    });
  }
});

// POST /api/ecommerce/payments/stripe/confirm - Confirm Stripe payment
router.post("/payments/stripe/confirm", async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update order payment status
      if (orderId) {
        await WebOrder.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paymentMethod: 'stripe',
          paymentId: paymentIntentId
        });
      }
      return res.json({ success: true, status: paymentIntent.status });
    }
    
    return res.json({ success: false, status: paymentIntent.status });
  } catch (err) {
    return res.status(500).json({ 
      message: "Failed to confirm payment", 
      error: err?.message 
    });
  }
});

// ============ PAYPAL PAYMENT ============

// POST /api/ecommerce/payments/paypal/create-order - Create PayPal order
router.post("/payments/paypal/create-order", async (req, res) => {
  try {
    const { amount, currency = 'USD', orderId } = req.body;
    
    // Parse amount to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // PayPal supported currencies - convert unsupported to USD
    const paypalSupportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'HKD', 'SGD', 'SEK', 'DKK', 'PLN', 'NOK', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'MYR', 'PHP', 'TWD', 'THB', 'RUB', 'INR', 'NZD'];
    let finalCurrency = currency.toUpperCase();
    let finalAmount = numAmount;
    
    // If currency not supported by PayPal, convert to USD (approximate)
    if (!paypalSupportedCurrencies.includes(finalCurrency)) {
      // Approximate conversion rates for unsupported currencies
      const conversionRates = {
        'SAR': 0.27, 'AED': 0.27, 'OMR': 2.60, 'BHD': 2.65, 'KWD': 3.25, 'QAR': 0.27
      };
      const rate = conversionRates[finalCurrency] || 0.27;
      finalAmount = numAmount * rate;
      finalCurrency = 'USD';
    }
    
    // Get PayPal credentials from database or env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const clientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const paypalMode = val.paypalMode || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    if (!clientId || !clientSecret) {
      console.error('PayPal credentials missing - clientId:', !!clientId, 'clientSecret:', !!clientSecret);
      return res.status(400).json({ 
        message: "PayPal is not configured. Please use Cash on Delivery or Card." 
      });
    }
    
    // Get PayPal access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      console.error('PayPal auth failed:', authData);
      return res.status(500).json({ message: "Failed to authenticate with PayPal. Check your credentials." });
    }
    
    // Create PayPal order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: finalCurrency,
          value: finalAmount.toFixed(2)
        },
        custom_id: orderId || ''
      }]
    };
    
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify(orderPayload)
    });
    
    const orderData = await orderResponse.json();
    
    if (orderData.id) {
      return res.json({ 
        success: true,
        orderId: orderData.id,
        approvalUrl: orderData.links?.find(l => l.rel === 'approve')?.href
      });
    }
    
    console.error('PayPal order creation failed:', orderData);
    return res.status(500).json({ message: orderData.message || "Failed to create PayPal order" });
  } catch (err) {
    console.error('PayPal error:', err);
    return res.status(500).json({ 
      message: "Failed to create PayPal order", 
      error: err?.message 
    });
  }
});

// POST /api/ecommerce/payments/paypal/capture - Capture PayPal payment
router.post("/payments/paypal/capture", async (req, res) => {
  try {
    const { paypalOrderId, orderId } = req.body;
    
    // Get PayPal credentials from database or env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const clientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const paypalMode = val.paypalMode || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ message: "PayPal is not configured" });
    }
    
    // Get access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    // Capture payment
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      }
    });
    
    const captureData = await captureResponse.json();
    
    if (captureData.status === 'COMPLETED') {
      // Update order payment status
      if (orderId) {
        await WebOrder.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paymentId: paypalOrderId
        });
      }
      return res.json({ success: true, status: captureData.status });
    }
    
    return res.json({ success: false, status: captureData.status });
  } catch (err) {
    return res.status(500).json({ 
      message: "Failed to capture payment", 
      error: err?.message 
    });
  }
});

// GET /api/ecommerce/payments/config - Get payment configuration (public keys)
router.get("/payments/config", async (req, res) => {
  try {
    // Get payment settings from database and env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    
    // Stripe: check env first, then database
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || val.stripePublishableKey;
    
    // PayPal: check database first, then env
    const paypalClientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    
    // Apple Pay settings
    const applePayEnabled = val.applePayEnabled || false;
    const applePayMerchantId = val.applePayMerchantId || null;
    const applePayMerchantName = val.applePayMerchantName || null;
    
    // Google Pay settings
    const googlePayEnabled = val.googlePayEnabled || false;
    const googlePayMerchantId = val.googlePayMerchantId || null;
    const googlePayMerchantName = val.googlePayMerchantName || null;
    const googlePayEnvironment = val.googlePayEnvironment || 'TEST';
    
    const config = {
      stripe: {
        enabled: !!stripeSecretKey,
        publishableKey: stripePublishableKey || null
      },
      paypal: {
        enabled: !!(paypalClientId && paypalClientSecret),
        clientId: paypalClientId || null
      },
      cod: {
        enabled: true
      },
      applepay: {
        enabled: applePayEnabled && !!applePayMerchantId,
        merchantId: applePayMerchantId,
        merchantName: applePayMerchantName,
        supportedCountries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
      },
      googlepay: {
        enabled: googlePayEnabled && !!googlePayMerchantId,
        merchantId: googlePayMerchantId,
        merchantName: googlePayMerchantName,
        environment: googlePayEnvironment,
        supportedCountries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
      }
    };
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ message: "Failed to get config" });
  }
});

export default router;
