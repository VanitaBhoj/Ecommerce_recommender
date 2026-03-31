import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { clearCartLines, loadCartLines, saveCartLines } from "../lib/cartStorage.js";

export default function Cart() {
  const { user, refresh } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [lines, setLines] = useState(loadCartLines);
  const [redeem, setRedeem] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const addProductId = useMemo(
    () => new URLSearchParams(location.search).get("add"),
    [location.search]
  );

  useEffect(() => {
    if (!addProductId) return;
    setLines((prev) => {
      const ix = prev.findIndex((l) => l.productId === addProductId);
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], quantity: next[ix].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        { productId: addProductId, quantity: 1, _name: null, _price: null, _eco: null },
      ];
    });
    // Clear the query param so clicking the same "Add to cart" link again works reliably.
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("add");
      return next;
    });
  }, [addProductId, setParams]);

  useEffect(() => {
    saveCartLines(lines);
  }, [lines]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enriched = await Promise.all(
        lines.map(async (l) => {
          if (l._name) return l;
          try {
            const p = await api(`/api/products/${l.productId}`);
            if (cancelled) return l;
            return {
              ...l,
              _name: p.name,
              _price: p.price,
              _eco: p.ecoScore,
            };
          } catch {
            return l;
          }
        })
      );
      if (!cancelled) setLines(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, [lines.map((l) => `${l.productId}:${l.quantity}`).join("|")]);

  const subtotal = useMemo(() => {
    return lines.reduce((s, l) => s + (l._price || 0) * l.quantity, 0);
  }, [lines]);

  const checkout = async () => {
    setErr("");
    setMsg("");
    if (!user) {
      setErr("Sign in to checkout.");
      return;
    }
    if (lines.length === 0) {
      setErr("Cart is empty.");
      return;
    }
    try {
      const items = lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items, redeemEcoPoints: redeem }),
      });
      await api(`/api/orders/${data.order._id}/confirm-payment`, { method: "POST" });
      setMsg(`Order ${data.order._id} paid (mock). Eco-points earned: ${data.order.ecoPointsEarned}`);
      setLines([]);
      clearCartLines();
      setRedeem(0);
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="page">
      <h1>Cart</h1>
      {!user && (
        <p className="hint">
          <Link to="/login">Sign in</Link> to checkout and earn eco-points.
        </p>
      )}
      {user && (
        <p className="hint">
          You have <strong>{user.ecoPoints}</strong> eco-points. Redeem up to subtotal (100 pts ≈ $1).
        </p>
      )}
      <div className="cart">
        {lines.length === 0 ? (
          <p className="muted">Your cart is empty. Browse products on the home page.</p>
        ) : (
          <ul className="cart-list">
            {lines.map((l) => (
              <li key={l.productId} className="cart-line">
                <div>
                  <strong>{l._name || "…"}</strong>
                  <span className="muted">
                    {" "}
                    · eco {l._eco ?? "—"} · ${(l._price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) =>
                        prev
                          .map((x) =>
                            x.productId === l.productId
                              ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                              : x
                          )
                      )
                    }
                  >
                    −
                  </button>
                  <span>{l.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.productId === l.productId ? { ...x, quantity: x.quantity + 1 } : x
                        )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <div className="cart-summary">
            <p>
              Subtotal: <strong>${subtotal.toFixed(2)}</strong>
            </p>
            {user && (
              <label className="inline">
                Redeem eco-points
                <input
                  type="number"
                  min={0}
                  max={user.ecoPoints}
                  value={redeem}
                  onChange={(e) => setRedeem(Number(e.target.value))}
                />
              </label>
            )}
            <button type="button" className="cta" onClick={checkout} disabled={!user}>
              Checkout (mock payment)
            </button>
          </div>
        )}
      </div>
      {err && <p className="error">{err}</p>}
      {msg && <p className="success">{msg}</p>}
    </div>
  );
}
