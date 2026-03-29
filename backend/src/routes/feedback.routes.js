import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { Feedback } from "../models/Feedback.model.js";
import { Order } from "../models/Order.model.js";
import { User } from "../models/User.model.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { orderId, productId, rating, comment, sustainabilityRelevant } = req.body;
    if (!orderId || !rating) {
      return res.status(400).json({ message: "orderId and rating required" });
    }
    const order = await Order.findOne({ _id: orderId, userId: req.userId });
    if (!order || order.status !== "paid") {
      return res.status(400).json({ message: "Invalid order for feedback" });
    }
    const fb = await Feedback.create({
      userId: req.userId,
      orderId,
      productId: productId || undefined,
      rating,
      comment: comment || "",
      sustainabilityRelevant: Boolean(sustainabilityRelevant),
    });
    order.feedbackSubmitted = true;
    await order.save();

    if (productId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          interactionHistory: {
            productId,
            rating,
            purchased: true,
            at: new Date(),
          },
        },
      });
    }

    res.status(201).json(fb);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "Feedback already submitted for this order" });
    }
    next(e);
  }
});

export default router;
