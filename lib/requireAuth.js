// lib/requireAuth.js
import { verifyToken } from "./auth.js";

export function requireAuth(req, res) {
  const auth = req.headers?.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }

  try {
    return verifyToken(token); // { id, email, iat, exp }
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return null;
  }
}