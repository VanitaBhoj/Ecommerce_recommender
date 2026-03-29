import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  const [recs, setRecs] = useState([]);
  const [products, setProducts] = useState([]);
  const [ecoWeight, setEcoWeight] = useState(0.35);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [p, r] = await Promise.all([
          api("/api/products"),
          api(`/api/recommendations?ecoWeight=${ecoWeight}`),
        ]);
        if (!cancelled) {
          setProducts(Array.isArray(p) ? p : []);
          setRecs(r.recommendations || []);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ecoWeight]);

  const seed = async () => {
    try {
      await api("/api/products/seed-demo", { method: "POST" });
      window.location.reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Eco-aware commerce</p>
          <h1>Recommendations that weigh sustainability.</h1>
          <p className="lede">
            Session signals for new visitors. History + session for returning shoppers.
            Tune how strongly eco-score influences ranking.
          </p>
          <div className="hero-actions">
            <label className="slider-label">
              Eco weight: {Math.round(ecoWeight * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ecoWeight}
                onChange={(e) => setEcoWeight(Number(e.target.value))}
              />
            </label>
            {user?.email ? (
              <span className="hint">Signed in as {user.email}</span>
            ) : (
              <span className="hint">Sign in to personalize from purchase history.</span>
            )}
          </div>
        </div>
        <div className="hero-card">
          <h3>How it works</h3>
          <ol className="steps">
            <li>Collaborative-style preferences from your interactions</li>
            <li>Content similarity on category, name, and tags (TF‑IDF + cosine)</li>
            <li>Eco-score blended into the hybrid feature space</li>
          </ol>
        </div>
      </section>

      {err && <p className="error">{err}</p>}

      <section className="section">
        <div className="section-head">
          <h2>For you</h2>
          {products.length === 0 && (
            <button type="button" className="secondary" onClick={seed}>
              Load demo products
            </button>
          )}
        </div>
        {loading ? (
          <p>Loading recommendations…</p>
        ) : (
          <div className="grid">
            {recs.map((r) =>
              r.product ? (
                <article key={r.product_id} className="card">
                  <div className="card-top">
                    <span className={`eco-badge ${r.product.ecoScore >= 80 ? "high" : ""}`}>
                      Eco {r.product.ecoScore}
                    </span>
                    <span className="score-tag">score {r.hybrid_score?.toFixed?.(3)}</span>
                  </div>
                  <h3>{r.product.name}</h3>
                  <p className="muted">{r.product.category}</p>
                  <p className="price">${r.product.price?.toFixed(2)}</p>
                  <Link className="cta ghost" to={`/cart?add=${r.product_id}`}>
                    Add to cart
                  </Link>
                </article>
              ) : null
            )}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Catalog</h2>
        <div className="grid">
          {products.map((p) => (
            <article key={p._id} className="card subtle">
              <div className="card-top">
                <span className={`eco-badge ${p.ecoScore >= 80 ? "high" : ""}`}>Eco {p.ecoScore}</span>
              </div>
              <h3>{p.name}</h3>
              <p className="muted">{p.category}</p>
              <p className="price">${p.price?.toFixed(2)}</p>
              <Link className="cta ghost" to={`/cart?add=${p._id}`}>
                Add to cart
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
