import pool from "../lib/db.js";
import { requireAuth } from "../lib/requireAuth.js";

export default async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = payload.id;

    const groupsResult = await pool.query(
      `
      SELECT id, name, category AS type
      FROM password_groups
      WHERE user_id = $1
      ORDER BY id DESC
      `,
      [userId]
    );

    const groups = groupsResult.rows;
    if (!groups.length) return res.status(200).json([]);

    const groupIds = groups.map((g) => g.id);

    const itemsResult = await pool.query(
      `
      SELECT id, group_id, username, email, password, note
      FROM password_items
      WHERE group_id = ANY($1)
      ORDER BY id DESC
      `,
      [groupIds]
    );

    const items = itemsResult.rows;

    const map = new Map(groups.map((g) => [g.id, { ...g, items: [] }]));
    for (const it of items) {
      const g = map.get(it.group_id);
      if (g) {
        g.items.push({
          id: it.id,
          username: it.username,
          email: it.email,
          password: it.password,
          note: it.note,
        });
      }
    }

    return res.status(200).json(Array.from(map.values()));
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}