const base = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export async function fetchHybridRecommendations(payload) {
  const url = `${base}/recommend`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service error: ${res.status} ${text}`);
  }
  return res.json();
}
