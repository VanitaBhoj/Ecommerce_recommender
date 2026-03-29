import { Router } from "express";
import { Product } from "../models/Product.model.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { User } from "../models/User.model.js";

const router = Router();

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { category, q, minEco, sort } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minEco != null && minEco !== "") filter.ecoScore = { $gte: Number(minEco) };
    if (q) {
      filter.$or = [
        { name: new RegExp(String(q), "i") },
        { tags: new RegExp(String(q), "i") },
        { description: new RegExp(String(q), "i") },
      ];
    }
    let sortSpec = { createdAt: -1 };
    if (sort === "eco") sortSpec = { ecoScore: -1, createdAt: -1 };
    if (sort === "price_asc") sortSpec = { price: 1 };
    if (sort === "price_desc") sortSpec = { price: -1 };
    const products = await Product.find(filter).sort(sortSpec).limit(100).lean();
    res.json(products);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p || !p.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          sessionActivity: {
            $each: [{ productId: p._id, event: "view", at: new Date() }],
            $slice: -200,
          },
        },
      });
    }
    res.json(p);
  } catch (e) {
    next(e);
  }
});

/** Seed helper for development — remove or protect in production */
router.post("/seed-demo", async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Disabled" });
    }
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.json({ message: "Products already exist", count });
    }
    const demo = [
      {
        name: "Organic Cotton T-Shirt",
        category: "Apparel",
        tags: ["organic", "fair-trade", "cotton"],
        price: 29.99,
        ecoScore: 88,
        carbonKgPerUnit: 2.1,
        stock: 50,
        description: "GOTS certified organic cotton.",
      },
      {
        name: "Bamboo Travel Mug",
        category: "Home",
        tags: ["bamboo", "reusable", "plastic-free"],
        price: 18.5,
        ecoScore: 92,
        carbonKgPerUnit: 0.8,
        stock: 120,
        description: "Lightweight bamboo shell, stainless interior.",
      },
      {
        name: "Refurbished Smartphone",
        category: "Electronics",
        tags: ["refurbished", "e-waste", "warranty"],
        price: 349,
        ecoScore: 72,
        carbonKgPerUnit: 55,
        stock: 15,
        description: "Certified refurb with 1-year warranty.",
      },
    ];
    await Product.insertMany(demo);
    res.status(201).json({ inserted: demo.length });
  } catch (e) {
    next(e);
  }
});

export default router;
