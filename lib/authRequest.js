// lib/authRequest.js
import { verifyToken } from "./auth.js";

const COOKIE_NAME = "keysecurity_token";

export function getTokenFromReq(req) {
  // 1) Authorization: Bearer <token> (útil p/ Postman)
  const auth = req.headers?.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  // 2) Cookie HttpOnly (p/ browser)
  const cookie = req.headers?.cookie || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);

  return null;
}

export function setAuthCookie(res, token) {
  const maxAge = 60 * 60 * 24 * 7; // 7 dias
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`
  );
}

export function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`
  );
}

export function requireAuth(req, res) {
  const token = getTokenFromReq(req);
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