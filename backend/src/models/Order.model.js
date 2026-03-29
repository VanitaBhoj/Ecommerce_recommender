import mongoose from "mongoose";

const orderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    ecoScoreAtPurchase: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lines: { type: [orderLineSchema], required: true },
    /** Sum of line items before eco-points discount */
    subtotal: { type: Number, required: true, min: 0 },
    /** Amount charged after eco-points discount */
    total: { type: Number, required: true, min: 0 },
    ecoPointsEarned: { type: Number, default: 0, min: 0 },
    ecoPointsRedeemed: { type: Number, default: 0, min: 0 },
    discountFromEcoPoints: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    paymentProvider: { type: String, default: "" },
    paymentIntentId: { type: String, default: "" },
    feedbackSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
