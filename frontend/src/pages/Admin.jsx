import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Admin() {
  const { user } = useAuth();
  const [adminKey, setAdminKey] = useState(localStorage.getItem("adminKey") || "");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    tags: "",
    price: "",
    ecoScore: "",
    carbonKgPerUnit: "",
    imageUrl: "",
    stock: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    price: "",
    ecoScore: "",
    stock: "",
    imageUrl: "",
  });

  const saveKey = () => {
    localStorage.setItem("adminKey", adminKey);
    setMsg("Admin key saved.");
    setErr("");
  };

  const setAdminError = (error) => {
    const message =
      error?.message === "Failed to fetch"
        ? "Cannot reach backend. Ensure backend server is running (http://localhost:5000) and try again."
        : error?.message || "Unknown error";
    setErr(message);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const list = await api("/api/products");
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      setAdminError(error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        ecoScore: Number(form.ecoScore),
        carbonKgPerUnit: form.carbonKgPerUnit ? Number(form.carbonKgPerUnit) : null,
        stock: Number(form.stock || 0),
        tags: form.tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
      const created = await api("/api/products", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      setMsg(`Product added: ${created.name}`);
      setForm({
        name: "",
        description: "",
        category: "",
        tags: "",
        price: "",
        ecoScore: "",
        carbonKgPerUnit: "",
        imageUrl: "",
        stock: "",
      });
      await loadProducts();
    } catch (error) {
      setAdminError(error);
    }
  };

  const removeProduct = async (productId, productName) => {
    const confirmed = window.confirm(`Delete "${productName}"? This cannot be undone.`);
    if (!confirmed) return;
    setMsg("");
    setErr("");
    try {
      await api(`/api/products/${productId}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      setMsg(`Deleted product: ${productName}`);
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (error) {
      setAdminError(error);
    }
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setEditForm({
      name: p.name || "",
      category: p.category || "",
      price: String(p.price ?? ""),
      ecoScore: String(p.ecoScore ?? ""),
      stock: String(p.stock ?? 0),
      imageUrl: p.imageUrl || "",
    });
    setMsg("");
    setErr("");
  };

  const saveEdit = async (productId) => {
    setMsg("");
    setErr("");
    try {
      const payload = {
        name: editForm.name,
        category: editForm.category,
        price: Number(editForm.price),
        ecoScore: Number(editForm.ecoScore),
        stock: Number(editForm.stock || 0),
        imageUrl: editForm.imageUrl,
      };
      const updated = await api(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      setProducts((prev) => prev.map((p) => (p._id === productId ? updated : p)));
      setEditingId("");
      setMsg(`Updated product: ${updated.name}`);
    } catch (error) {
      setAdminError(error);
    }
  };

  return (
    <div className="page narrow admin-page">
      {user ? (
        <div className="admin-lock">
          <h1>Admin Access</h1>
          <p className="hint">Please sign out from user account to manage products as admin.</p>
        </div>
      ) : null}
      {user ? null : (
        <>
      <h1>Admin - Add Product</h1>
      <p className="hint">Use backend `ADMIN_API_KEY` to authorize product creation.</p>
      <div className="admin-key-row">
        <input
          type="password"
          placeholder="Enter ADMIN_API_KEY"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
        <button type="button" className="secondary" onClick={saveKey}>
          Save key
        </button>
      </div>

      <form className="form" onSubmit={submit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        </label>
        <label>
          Category
          <input
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            placeholder="Apparel / Home / Electronics / Beauty"
            required
          />
        </label>
        <label>
          Description
          <input
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </label>
        <label>
          Tags (comma separated)
          <input value={form.tags} onChange={(e) => setField("tags", e.target.value)} />
        </label>
        <label>
          Price
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            required
          />
        </label>
        <label>
          Eco score (0-100)
          <input
            type="number"
            min="0"
            max="100"
            value={form.ecoScore}
            onChange={(e) => setField("ecoScore", e.target.value)}
            required
          />
        </label>
        <label>
          Carbon kg/unit (optional)
          <input
            type="number"
            step="0.01"
            value={form.carbonKgPerUnit}
            onChange={(e) => setField("carbonKgPerUnit", e.target.value)}
          />
        </label>
        <label>
          Image URL
          <input
            value={form.imageUrl}
            onChange={(e) => setField("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </label>
        <label>
          Stock
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setField("stock", e.target.value)}
          />
        </label>
        {err ? <p className="error">{err}</p> : null}
        {msg ? <p className="success">{msg}</p> : null}
        <button type="submit" className="cta">
          Add product
        </button>
      </form>

      <section className="section">
        <h2>Existing products</h2>
        {loadingProducts ? (
          <p className="muted">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="muted">No products found.</p>
        ) : (
          <div className="admin-list">
            {products.map((p) => (
              <article key={p._id} className="admin-item">
                <div>
                  <strong>{p.name}</strong>
                  <p className="muted">
                    {p.category} · ${Number(p.price || 0).toFixed(2)} · Eco {p.ecoScore}
                  </p>
                </div>
                <div className="admin-actions">
                  <button type="button" className="secondary" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeProduct(p._id, p.name)}
                  >
                    Delete
                  </button>
                </div>
                {editingId === p._id ? (
                  <div className="admin-edit">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <input
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="Category"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="Price"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.ecoScore}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, ecoScore: e.target.value }))
                      }
                      placeholder="Eco score"
                    />
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, stock: e.target.value }))}
                      placeholder="Stock"
                    />
                    <input
                      value={editForm.imageUrl}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      placeholder="Image URL"
                    />
                    <div className="admin-actions">
                      <button type="button" className="cta small" onClick={() => saveEdit(p._id)}>
                        Save
                      </button>
                      <button type="button" className="secondary" onClick={() => setEditingId("")}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}

