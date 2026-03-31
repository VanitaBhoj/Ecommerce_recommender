const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, options = {}) {
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...options.headers,
      },
      credentials: "include",
    });
  } catch (err) {
    if (!navigator.onLine) {
      throw new Error("No network connection. Please check your internet and backend server.");
    }
    try {
      const health = await fetch(`${base}/api/health`, { method: "GET", credentials: "include" });
      if (!health.ok) {
        throw new Error(`Backend health check failed: ${health.status} ${health.statusText}`);
      }
      throw new Error("Network request failed while reaching backend. Make sure backend is running on port 5000 and CORS is configured.");
    } catch (healthError) {
      throw new Error(`Unable to reach backend at ${base}. ${healthError.message}`);
    }
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data?.message ? data.message : res.statusText;
    throw new Error(msg);
  }
  return data;
}

export { base as apiBase };
