"""
Hybrid recommender: collaborative-style user-item similarity + content features + eco weighting.
Session-heavy signals for cold-start; history augments for returning users.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

app = FastAPI(title="Eco Recommender ML Service", version="0.1.0")


class CatalogItem(BaseModel):
    product_id: str
    name: str = ""
    category: str = ""
    tags: list[str] = Field(default_factory=list)
    eco_score: float = 50.0
    price: float = 0.0


class HistoryEntry(BaseModel):
    product_id: str | None = None
    rating: float | None = None
    purchased: bool = False


class SessionEntry(BaseModel):
    product_id: str | None = None
    event: str = "view"


class UserPayload(BaseModel):
    user_id: str | None = None
    interaction_history: list[HistoryEntry] = Field(default_factory=list)
    session_activity: list[SessionEntry] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    catalog: list[CatalogItem]
    user: UserPayload | None = None
    eco_weight: float = 0.35
    top_k: int = 12


def _content_matrix(catalog: list[CatalogItem]) -> np.ndarray:
    docs = []
    for p in catalog:
        tag_txt = " ".join(p.tags)
        docs.append(f"{p.category} {p.name} {tag_txt}")
    if not docs:
        return np.zeros((0, 0))
    vec = TfidfVectorizer(max_features=256)
    return vec.fit_transform(docs).toarray()


def _user_pref_vector(
    catalog_ids: list[str],
    history: list[HistoryEntry],
    session: list[SessionEntry],
    content_vecs: np.ndarray,
) -> np.ndarray | None:
    id_to_idx = {pid: i for i, pid in enumerate(catalog_ids)}
    weights: dict[str, float] = {}

    for h in history:
        if not h.product_id or h.product_id not in id_to_idx:
            continue
        w = 1.0
        if h.purchased:
            w += 1.0
        if h.rating is not None:
            w += float(h.rating) / 5.0
        weights[h.product_id] = weights.get(h.product_id, 0.0) + w

    ev_w = {"view": 0.5, "search": 0.6, "cart_add": 1.2, "purchase": 2.0}
    for s in session:
        if not s.product_id or s.product_id not in id_to_idx:
            continue
        weights[s.product_id] = weights.get(s.product_id, 0.0) + ev_w.get(s.event, 0.5)

    if not weights:
        return None

    pref = np.zeros(content_vecs.shape[1])
    for pid, w in weights.items():
        idx = id_to_idx[pid]
        pref += w * content_vecs[idx]
    norm = np.linalg.norm(pref)
    if norm < 1e-9:
        return None
    return pref / norm


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "ml-service"}


@app.post("/recommend")
def recommend(body: RecommendRequest) -> dict[str, Any]:
    catalog = body.catalog
    if not catalog:
        return {"recommendations": []}

    ids = [p.product_id for p in catalog]
    eco = np.array([p.eco_score for p in catalog], dtype=np.float64).reshape(-1, 1)
    eco_n = normalize(eco, axis=0, norm="max").ravel()
    if np.allclose(eco_n.max(), 0):
        eco_n = np.ones(len(catalog)) / max(len(catalog), 1)

    content = _content_matrix(catalog)
    w_eco = float(np.clip(body.eco_weight, 0.0, 1.0))
    content_part = (1.0 - w_eco) * normalize(content, axis=1, norm="l2")
    eco_part = w_eco * eco_n.reshape(-1, 1)
    hybrid_features = np.hstack([content_part, eco_part])

    user = body.user
    scores = np.zeros(len(catalog))

    if user:
        pref = _user_pref_vector(ids, user.interaction_history, user.session_activity, content)
        if pref is not None:
            sim_c = cosine_similarity(pref.reshape(1, -1), content)
            collab_like = sim_c.ravel()
            scores += 0.65 * collab_like

        # Popularity-style baseline from session touches on catalog
        touch = np.zeros(len(catalog))
        id_to_i = {pid: i for i, pid in enumerate(ids)}
        for s in user.session_activity:
            if s.product_id in id_to_i:
                touch[id_to_i[s.product_id]] += 1.0
        if touch.sum() > 0:
            scores += 0.15 * (touch / (touch.max() + 1e-9))

    # Content eco-hybrid self-similarity fallback / blend
    global_profile = hybrid_features.mean(axis=0, keepdims=True)
    gsim = cosine_similarity(hybrid_features, global_profile).ravel()
    scores += 0.2 * gsim

    # Mild de-duplication: downweight already strongly interacted items when user exists
    if user:
        seen = {h.product_id for h in user.interaction_history if h.product_id}
        for s in user.session_activity:
            if s.product_id:
                seen.add(s.product_id)
        for i, pid in enumerate(ids):
            if pid in seen:
                scores[i] *= 0.35

    order = np.argsort(-scores)
    top_k = max(1, min(body.top_k, 50))
    top_idx = order[:top_k]

    recs = []
    for rank, i in enumerate(top_idx):
        recs.append(
            {
                "product_id": ids[i],
                "hybrid_score": float(scores[i]),
                "breakdown": {
                    "eco_score": float(catalog[i].eco_score),
                    "eco_weight_used": w_eco,
                },
            }
        )

    return {"recommendations": recs}
