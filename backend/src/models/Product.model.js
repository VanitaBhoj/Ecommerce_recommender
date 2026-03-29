import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },
    /** 0–100: higher = more sustainable (used for eco-aware ranking) */
    ecoScore: { type: Number, required: true, min: 0, max: 100, default: 50 },
    /** Approximate carbon footprint label for transparency (optional) */
    carbonKgPerUnit: { type: Number, min: 0, default: null },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, ecoScore: -1 });
productSchema.index({ tags: 1 });

export const Product = mongoose.model("Product", productSchema);
