import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { Product } from "../models/Product.model.js";
import { Order } from "../models/Order.model.js";
import { User } from "../models/User.model.js";
import { computeEcoPointsForOrder, ecoPointsToDiscountCents } from "../lib/ecoPoints.js";
import { expandCatalogFromSignals } from "../services/catalogExpansion.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, redeemEcoPoints } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items[] required" });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let redeem = Math.min(Number(redeemEcoPoints || 0), user.ecoPoints);
    redeem = Math.max(0, Math.floor(redeem));

    const lines = [];
    for (const item of items) {
      const p = await Product.findById(item.productId);
      if (!p || !p.isActive) {
        return res.status(400).json({ message: `Invalid product ${item.productId}` });
      }
      const qty = Math.max(1, Number(item.quantity || 1));
      if (p.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for ${p.name}` });
      }
      lines.push({
        productId: p._id,
        quantity: qty,
        unitPrice: p.price,
        ecoScoreAtPurchase: p.ecoScore,
      });
    }

    const subtotalCents = lines.reduce((s, l) => s + Math.round(l.unitPrice * 100) * l.quantity, 0);
    const discountCents = Math.min(ecoPointsToDiscountCents(redeem), subtotalCents);
    const payableCents = subtotalCents - discountCents;

    const ecoPointsEarned = computeEcoPointsForOrder(lines);

    const order = await Order.create({
      userId: user._id,
      lines,
      subtotal: subtotalCents / 100,
      total: payableCents / 100,
      ecoPointsEarned,
      ecoPointsRedeemed: redeem,
      discountFromEcoPoints: discountCents / 100,
      status: "pending",
    });

    await User.findByIdAndUpdate(user._id, {
      $inc: { ecoPoints: -redeem },
      $push: {
        sessionActivity: {
          $each: lines.map((l) => ({
            productId: l.productId,
            event: "purchase",
            at: new Date(),
          })),
          $slice: -200,
        },
        interactionHistory: {
          $each: lines.map((l) => ({
            productId: l.productId,
            purchased: true,
            at: new Date(),
          })),
          $slice: -500,
        },
      },
    });

    for (const l of lines) {
      await Product.findByIdAndUpdate(l.productId, { $inc: { stock: -l.quantity } });
    }

    res.status(201).json({
      order,
      message: "Order created (payment placeholder — integrate gateway in Phase 4)",
      payment: { amountDue: payableCents / 100, currency: "USD" },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

/** Simulate payment success — replace with real webhook in Phase 4 */
router.post("/:id/confirm-payment", requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status === "paid") {
      return res.json(order);
    }
    order.status = "paid";
    order.paymentProvider = "mock";
    order.paymentIntentId = `mock_${order._id}`;
    await order.save();
    await User.findByIdAndUpdate(req.userId, { $inc: { ecoPoints: order.ecoPointsEarned } });
    const purchased = await Product.find({
      _id: { $in: order.lines.map((line) => line.productId) },
    }).lean();
    await expandCatalogFromSignals({
      preferredCategories: purchased.map((p) => p.category),
      preferredTags: purchased.flatMap((p) => p.tags || []),
    });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

export default router;
