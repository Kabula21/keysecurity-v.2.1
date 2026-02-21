// api/me.js
import pool from "../lib/db.js";
import { requireAuth } from "../lib/requireAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const r = await pool.query(
      `
      SELECT id, email, first_name, last_name, avatar
      FROM users
      WHERE id = $1
      `,
      [payload.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.status(200).json({ success: true, user: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}