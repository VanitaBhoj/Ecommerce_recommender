import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { addProductToCart } from "../lib/cartStorage.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop";

function normalizeImageUrl(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const p = await api(`/api/products/${id}`);
        if (!cancelled) setProduct(p);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addToCart = async () => {
    if (!product?._id) return;
    try {
      if (user?.id) {
        await api("/api/products/events/cart-add", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
      }
    } catch {
      // Non-blocking: proceed even if event logging fails.
    }
    addProductToCart(product._id);
    nav("/");
  };

  if (loading) return <p>Loading product...</p>;
  if (err) return <p className="error">{err}</p>;
  if (!product) return <p className="muted">Product not found.</p>;

  return (
    <div className="page">
      <Link to="/" className="muted">
        ← Back to catalog
      </Link>
      <section className="product-detail">
        {product.imageUrl ? (
          <img
            src={normalizeImageUrl(product.imageUrl)}
            alt={product.name}
            className="product-image-large"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
        ) : (
          <div className="image-placeholder large">No image</div>
        )}
        <div>
          <span className={`eco-badge ${product.ecoScore >= 80 ? "high" : ""}`}>
            Eco {product.ecoScore}
          </span>
          <h1>{product.name}</h1>
          <p className="muted">{product.category}</p>
          <p>{product.description || "No description."}</p>
          <p className="price">${Number(product.price || 0).toFixed(2)}</p>
          <p className="muted">Stock: {product.stock}</p>
          {product.tags?.length ? (
            <p className="muted">Tags: {product.tags.join(", ")}</p>
          ) : null}
          <button type="button" className="cta" onClick={addToCart}>
            Add to cart
          </button>
        </div>
      </section>
    </div>
  );
}

