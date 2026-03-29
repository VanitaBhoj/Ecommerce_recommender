import mongoose from "mongoose";

const sessionActivitySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    event: { type: String, enum: ["view", "cart_add", "purchase", "search"], required: true },
    metadata: { type: Map, of: String, default: {} },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true },
    ecoPoints: { type: Number, default: 0, min: 0 },
    /** Browsing / interaction history for personalization */
    interactionHistory: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        rating: { type: Number, min: 0, max: 5 },
        purchased: { type: Boolean, default: false },
        at: { type: Date, default: Date.now },
      },
    ],
    /** Recent session events (capped in app logic if needed) */
    sessionActivity: [sessionActivitySchema],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
