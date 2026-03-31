import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { addProductToCart } from "../lib/cartStorage.js";
import AppIcon from "../assets/app-icon.svg";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop";

function normalizeImageUrl(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [recs, setRecs] = useState([]);
  const [products, setProducts] = useState([]);
  const ecoAwareness = 90;
  const [query, setQuery] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [p, r] = await Promise.all([
          api(`/api/products${query ? `?q=${encodeURIComponent(query)}` : ""}`),
          api(`/api/recommendations`),
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
  }, [query]);

  const addToCart = async (productId) => {
    try {
      if (user?.id) {
        await api("/api/products/events/cart-add", {
          method: "POST",
          body: JSON.stringify({ productId }),
        });
      }
    } catch {
      // Ignore event logging failures to keep UX smooth.
    }
    addProductToCart(productId);
    nav("/");
  };

  const seed = async () => {
    try {
      await api("/api/products/seed-demo", { method: "POST" });
      window.location.reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();

  const prioritizedRecs = recs
    .slice()
    .sort((a, b) => {
      if (!normalizedQuery) return 0;
      const aMatch = a?.product?.name?.toLowerCase().includes(normalizedQuery) ||
        a?.product?.category?.toLowerCase().includes(normalizedQuery);
      const bMatch = b?.product?.name?.toLowerCase().includes(normalizedQuery) ||
        b?.product?.category?.toLowerCase().includes(normalizedQuery);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return (b.hybrid_score || 0) - (a.hybrid_score || 0);
    });

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Eco-aware commerce</p>
          <h1>Increased eco-aware rankings for better sustainable shopping</h1>
          <p className="lede">
            Session signals for new visitors. History + session for returning shoppers.
            Search-first products rise to the top, with a green-first recommender tone.
          </p>
          <div className="discover-stats">
            <div className="stat-box">
              <strong>{products.length}</strong>
              <span>Products</span>
            </div>
            <div className="stat-box">
              <strong>{recs.length}</strong>
              <span>Recommendations</span>
            </div>
            <div className="stat-box">
              <strong>{ecoAwareness}%</strong>
              <span>Eco Preference</span>
            </div>
          </div>
          <div className="hero-actions">
            <label className="slider-label">
              Search products
              <input
                type="text"
                value={query}
                placeholder="Try: bamboo, tshirt, refurbished..."
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {user?.email ? (
              <span className="hint">Signed in as {user.email}</span>
            ) : (
              <span className="hint">Sign in to personalize from purchase history.</span>
            )}
          </div>
        </div>
        <div className="hero-image">
          <img src={AppIcon} alt="Ecommerce Recommender App Icon" />
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
            {prioritizedRecs.map((r) =>
              r.product ? (
                <article key={r.product_id} className="card">
                  {r.product.imageUrl ? (
                    <img
                      src={normalizeImageUrl(r.product.imageUrl)}
                      alt={r.product.name}
                      className="product-image"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="image-placeholder">No image</div>
                  )}
                  <div className="card-top">
                    <span className={`eco-badge ${r.product.ecoScore >= 80 ? "high" : ""}`}>
                      Eco {r.product.ecoScore}
                    </span>
                    <span className="score-tag">score {r.hybrid_score?.toFixed?.(3)}</span>
                  </div>
                  <h3>{r.product.name}</h3>
                  <p className="muted">{r.product.category}</p>
                  <p className="price">${r.product.price?.toFixed(2)}</p>
                  <Link className="muted" to={`/products/${r.product_id}`}>
                    View details
                  </Link>
                  <button type="button" className="cta ghost" onClick={() => addToCart(r.product_id)}>
                    Add to cart
                  </button>
                </article>
              ) : null
            )}
          </div>
        )}
      </section>

    </div>
  );
}
