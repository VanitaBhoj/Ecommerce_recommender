import { Router } from "express";
import { Product } from "../models/Product.model.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { User } from "../models/User.model.js";
import { expandCatalogFromSignals } from "../services/catalogExpansion.js";

const router = Router();

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { category, q, minEco, sort } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minEco != null && minEco !== "") filter.ecoScore = { $gte: Number(minEco) };
    if (q) {
      if (req.userId) {
        await User.findByIdAndUpdate(req.userId, {
          $push: {
            sessionActivity: {
              $each: [{ event: "search", metadata: { q: String(q) }, at: new Date() }],
              $slice: -200,
            },
          },
        });
      }
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

router.post("/events/cart-add", requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }
    const product = await Product.findById(productId).lean();
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }
    await User.findByIdAndUpdate(req.userId, {
      $push: {
        sessionActivity: {
          $each: [{ productId, event: "cart_add", at: new Date() }],
          $slice: -200,
        },
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/auto-expand", requireAuth, async (req, res, next) => {
  try {
    const me = await User.findById(req.userId).lean();
    if (!me) return res.status(404).json({ message: "User not found" });
    const events = me.sessionActivity || [];
    const interactions = me.interactionHistory || [];
    const recentProductIds = [
      ...events.map((e) => e.productId).filter(Boolean),
      ...interactions.map((i) => i.productId).filter(Boolean),
    ];
    const products = recentProductIds.length
      ? await Product.find({ _id: { $in: recentProductIds } }).lean()
      : [];
    const preferredCategories = products.map((p) => p.category).filter(Boolean);
    const preferredTags = products.flatMap((p) => p.tags || []);
    const added = await expandCatalogFromSignals({ preferredCategories, preferredTags });
    res.status(201).json({ addedCount: added.length, added });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    // Lightweight admin protection for demo projects.
    const adminKey = process.env.ADMIN_API_KEY || "admin-dev-key";
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(403).json({ message: "Forbidden: invalid admin key" });
    }
    const payload = req.body || {};
    if (!payload.name || !payload.category || payload.price == null || payload.ecoScore == null) {
      return res
        .status(400)
        .json({ message: "name, category, price, ecoScore are required" });
    }
    const product = await Product.create({
      name: payload.name,
      description: payload.description || "",
      category: payload.category,
      tags: payload.tags || [],
      price: Number(payload.price),
      ecoScore: Number(payload.ecoScore),
      carbonKgPerUnit:
        payload.carbonKgPerUnit == null ? null : Number(payload.carbonKgPerUnit),
      imageUrl: payload.imageUrl || "",
      stock: Number(payload.stock ?? 0),
    });
    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const adminKey = process.env.ADMIN_API_KEY || "admin-dev-key";
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(403).json({ message: "Forbidden: invalid admin key" });
    }
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ ok: true, deletedId: req.params.id, name: deleted.name });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const adminKey = process.env.ADMIN_API_KEY || "admin-dev-key";
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(403).json({ message: "Forbidden: invalid admin key" });
    }
    const payload = req.body || {};
    const update = {
      ...(payload.name != null ? { name: payload.name } : {}),
      ...(payload.description != null ? { description: payload.description } : {}),
      ...(payload.category != null ? { category: payload.category } : {}),
      ...(payload.tags != null ? { tags: payload.tags } : {}),
      ...(payload.price != null ? { price: Number(payload.price) } : {}),
      ...(payload.ecoScore != null ? { ecoScore: Number(payload.ecoScore) } : {}),
      ...(payload.carbonKgPerUnit != null
        ? { carbonKgPerUnit: Number(payload.carbonKgPerUnit) }
        : {}),
      ...(payload.imageUrl != null ? { imageUrl: payload.imageUrl } : {}),
      ...(payload.stock != null ? { stock: Number(payload.stock) } : {}),
      ...(payload.isActive != null ? { isActive: Boolean(payload.isActive) } : {}),
    };
    const updated = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(updated);
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
        imageUrl:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop",
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
        imageUrl:
          "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&auto=format&fit=crop",
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
        imageUrl:
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop",
      },
    ];
    await Product.insertMany(demo);
    res.status(201).json({ inserted: demo.length });
  } catch (e) {
    next(e);
  }
});

export default router;
