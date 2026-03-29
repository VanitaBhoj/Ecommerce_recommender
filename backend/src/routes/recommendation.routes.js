import { Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { User } from "../models/User.model.js";
import { Product } from "../models/Product.model.js";
import { fetchHybridRecommendations } from "../services/mlClient.js";

const router = Router();

/**
 * Builds payload for ML service: catalog + user profile + session signals.
 */
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).lean();
    let userPayload = null;
    if (req.userId) {
      const user = await User.findById(req.userId).lean();
      if (user) {
        userPayload = {
          user_id: String(user._id),
          interaction_history: (user.interactionHistory || []).map((h) => ({
            product_id: String(h.productId),
            rating: h.rating,
            purchased: h.purchased,
          })),
          session_activity: (user.sessionActivity || []).map((s) => ({
            product_id: s.productId ? String(s.productId) : null,
            event: s.event,
          })),
        };
      }
    }

    const catalog = products.map((p) => ({
      product_id: String(p._id),
      name: p.name,
      category: p.category,
      tags: p.tags || [],
      eco_score: p.ecoScore,
      price: p.price,
    }));

    let results;
    try {
      results = await fetchHybridRecommendations({
        catalog,
        user: userPayload,
        eco_weight: Number(req.query.ecoWeight || 0.35),
        top_k: Number(req.query.topK || 12),
      });
    } catch (err) {
      console.warn("ML fallback:", err.message);
      const fallback = [...products]
        .sort((a, b) => b.ecoScore - a.ecoScore)
        .slice(0, 12)
        .map((p, i) => ({
          product_id: String(p._id),
          hybrid_score: 1 - i * 0.02,
          breakdown: { fallback: true },
        }));
      results = { recommendations: fallback };
    }

    const byId = new Map(products.map((p) => [String(p._id), p]));
    const enriched = (results.recommendations || []).map((r) => ({
      ...r,
      product: byId.get(r.product_id) || null,
    }));

    res.json({ recommendations: enriched });
  } catch (e) {
    next(e);
  }
});

export default router;
