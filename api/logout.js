// api/logout.js
import { clearAuthCookie } from "../lib/authRequest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearAuthCookie(res);
  return res.status(200).json({ success: true });
}