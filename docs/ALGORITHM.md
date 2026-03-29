# Recommendation algorithm

## Goals

- **Hybrid**: combine collaborative-style signals with **content-based** similarity and **eco-score** weighting.
- **Cold start**: use **session activity** (views, cart adds) when purchase history is sparse.
- **Transparency**: expose `eco_weight` as a dial; higher values assign more model capacity to the eco dimension.

## Feature construction

1. **Content**: For each product, build a text document from `category`, `name`, and `tags`. Apply **TF‑IDF** vectorization (`max_features=256`).
2. **Eco**: Normalize **eco-score** column to \([0,1]\) per request (max norm); concatenate with content vectors:
   \[
   \mathbf{h}_i = [(1-\lambda)\,\text{L2}(\mathbf{t}_i) \;\Vert\; \lambda\,\tilde{e}_i]
   \]
   where \(\lambda\) = `eco_weight`, \(\mathbf{t}_i\) is the TF‑IDF row, \(\tilde{e}_i\) is normalized eco-score.
3. **Global profile**: Mean hybrid vector over catalog used as a soft default toward “typical” sustainable assortments.

## User preference vector (content space)

- Aggregate **interaction history**: purchases and ratings increase weight on that product’s TF‑IDF row; sum and L2-normalize to form \(\mathbf{p}\).
- Aggregate **session events** with weights: `purchase` > `cart_add` > `view`.

## Scoring (per user request)

1. **Collaborative-style term**: \(\cos(\mathbf{p}, \mathbf{t}_i)\) between user preference and each product’s TF‑IDF row (scaled 0.65).
2. **Session popularity**: normalized touch counts (scaled 0.15).
3. **Global hybrid similarity**: \(\cos(\mathbf{h}_i, \bar{\mathbf{h}})\) (scaled 0.20).
4. **De-emphasis**: multiply score by `0.35` for products already heavily present in history + session to encourage diversity.

## Serving

- API returns `top_k` items with `hybrid_score` and simple **breakdown** metadata for debugging and UI.

## Extensions (Phase 3+)

- Maintain a sparse **user–item matrix** from orders and explicit ratings; use **cosine similarity between users or items** for neighborhood CF.
- Train **matrix factorization** (e.g. implicit ALS) offline; blend with eco-aware re-ranking.
- Calibrate `eco_weight` from A/B tests on sustainability KPIs vs. revenue.

## Eco-points (order reward)

Backend `computeEcoPointsForOrder` awards more points for higher **ecoScoreAtPurchase** tiers; redemption uses **100 points ≈ \$1** discount (configurable in `backend/src/lib/ecoPoints.js`).
