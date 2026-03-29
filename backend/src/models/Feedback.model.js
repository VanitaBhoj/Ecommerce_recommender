import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
    /** Optional: was sustainability important for this purchase? */
    sustainabilityRelevant: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** One feedback document per order per user (extend to line-level later if needed) */
feedbackSchema.index({ orderId: 1, userId: 1 }, { unique: true });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
