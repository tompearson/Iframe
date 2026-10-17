/**
 * Vercel serverless BFF — POST /api/query → Render RAG (server-side Bearer).
 * Env: RAG_API_URL, RAG_SERVICE_SECRET, EMBED_MAX_* (optional)
 */

const sessionStore = new Map();
const ipStore = new Map();

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function config() {
  return {
    maxSession: intEnv("EMBED_MAX_TURNS_PER_SESSION", 20),
    maxIp: intEnv("EMBED_MAX_TURNS_PER_IP", 60),
    sessionTtlMs: intEnv("EMBED_SESSION_TTL_SECONDS", 86400) * 1000,
    ipTtlMs: intEnv("EMBED_IP_TTL_SECONDS", 3600) * 1000,
    maxQueryLen: intEnv("EMBED_MAX_QUERY_LENGTH", 1000),
  };
}

function prune(store, ttlMs) {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expires <= now) store.delete(k);
  }
}

function checkLimit(sessionId, ip) {
  const cfg = config();
  prune(sessionStore, cfg.sessionTtlMs);
  prune(ipStore, cfg.ipTtlMs);
  const now = Date.now();
  const sid = (sessionId || "").trim() || "anonymous";
  const addr = ip || "unknown";

  const s = sessionStore.get(sid) || { count: 0, expires: now + cfg.sessionTtlMs };
  const i = ipStore.get(addr) || { count: 0, expires: now + cfg.ipTtlMs };

  if (s.count >= cfg.maxSession) {
    return { ok: false, detail: "Session turn limit reached. Start a new chat or try again later." };
  }
  if (i.count >= cfg.maxIp) {
    return { ok: false, detail: "Too many requests from this network. Please try again later." };
  }

  sessionStore.set(sid, { count: s.count + 1, expires: s.expires });
  ipStore.set(addr, { count: i.count + 1, expires: i.expires });
  const remaining = Math.min(cfg.maxSession - s.count - 1, cfg.maxIp - i.count - 1);
  return { ok: true, remaining: Math.max(0, remaining) };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ detail: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ detail: "Invalid JSON body" });
    }
  }
  body = body || {};

  const query = (body.query || "").trim();
  const cfg = config();
  if (!query) return res.status(400).json({ detail: "query is required" });
  if (query.length > cfg.maxQueryLen) {
    return res.status(400).json({ detail: `query exceeds ${cfg.maxQueryLen} characters` });
  }

  const sessionId = req.headers["x-embed-session-id"];
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const limit = checkLimit(sessionId, ip);
  if (!limit.ok) {
    return res.status(429).json({ detail: limit.detail, turnsRemaining: 0 });
  }

  const base = (process.env.RAG_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return res.status(500).json({ detail: "RAG_API_URL is not configured on Vercel" });
  }

  const headers = { "Content-Type": "application/json" };
  const secret = process.env.RAG_SERVICE_SECRET;
  if (secret) headers.Authorization = `Bearer ${secret}`;

  let upstream;
  try {
    upstream = await fetch(`${base}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    return res.status(502).json({ detail: `Cannot reach RAG API: ${err.message}` });
  }

  const text = await upstream.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { detail: text || upstream.statusText };
  }

  if (!upstream.ok) {
    return res.status(upstream.status).json(data);
  }

  data.turnsRemaining = limit.remaining;
  return res.status(200).json(data);
};
