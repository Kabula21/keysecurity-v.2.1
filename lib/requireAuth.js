// lib/requireAuth.js
import { verifyToken } from "./auth.js";

function parseCookies(header = "") {
  return header.split(";").reduce((acc, part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join("=") || "");
    return acc;
  }, {});
}

export function requireAuth(req, res) {
  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  const cookies = parseCookies(req.headers?.cookie || "");
  const cookieToken = cookies.keysecurity_token || null;

  const token = bearer || cookieToken;

  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return null;
  }
}