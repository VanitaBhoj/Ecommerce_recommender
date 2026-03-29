# Eco-aware e-commerce recommender

Full-stack scaffold: **MERN** (MongoDB, Express, React, Node) plus a **Python FastAPI** microservice for hybrid, eco-weighted recommendations.

## Features

- JWT authentication, user profiles with **eco-points**
- Product catalog with **eco-score** (0–100)
- **Hybrid recommendations**: content (TF‑IDF + cosine) + session/history signals + eco dimension; tunable **eco weight** from the UI
- Cart, mock checkout, eco-points earn/redeem on orders
- Feedback API (ratings + optional sustainability flag)
- Documentation in `docs/`: architecture, schema, algorithms

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Python 3.11+ (for ML service)

## Quick start

### 1. MongoDB

Run MongoDB locally or set `MONGODB_URI` in `backend/.env` (copy from `backend/.env.example`).

### 2. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

API: `http://localhost:5000/api/health`

### 3. ML service

```bash
cd ml-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: `http://127.0.0.1:8000/health`

Set `ML_SERVICE_URL=http://127.0.0.1:8000` in `backend/.env` (default).

### 4. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Click **Load demo products** if the catalog is empty.

## API overview

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register`, `/api/auth/login` | JWT |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/products` | Query: `category`, `q`, `minEco`, `sort` |
| POST | `/api/products/seed-demo` | Dev only |
| GET | `/api/recommendations` | `ecoWeight`, `topK`; calls Python |
| POST | `/api/orders` | Body: `items`, `redeemEcoPoints` |
| POST | `/api/orders/:id/confirm-payment` | Mock payment + award points |
| POST | `/api/feedback` | After paid order |

## Project layout

- `backend/` — Express API, Mongoose models
- `frontend/` — Vite + React SPA
- `ml-service/` — FastAPI + scikit-learn hybrid scorer
- `docs/` — Architecture, schema, algorithm notes

## Next steps (your roadmap)

- Replace mock payment with **Stripe** (or Razorpay) webhooks
- Harden validation, rate limits, and admin product CRUD
- Add automated tests and a production **Docker Compose** / cloud deploy
- Expand CF with a persisted user–item matrix and offline training jobs

## License

Use freely for learning and demos; add a license if you ship publicly.
