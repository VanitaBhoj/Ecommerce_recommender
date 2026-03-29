import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Cart from "./pages/Cart.jsx";
import "./index.css";

function Shell() {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          Eco Shop
        </Link>
        <nav className="nav">
          <Link to="/">Discover</Link>
          <Link to="/cart">Cart</Link>
          {!loading && user ? (
            <>
              <span className="eco-pill" title="Eco-points balance">
                {user.ecoPoints ?? 0} eco pts
              </span>
              <button type="button" className="linkish" onClick={() => { logout(); nav("/"); }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="cta small" to="/register">
                Join
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>
          Hybrid ML recommendations with eco-aware ranking — MERN + FastAPI scaffold.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
