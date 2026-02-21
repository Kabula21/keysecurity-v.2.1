import pool from "../lib/db.js";
import { requireAuth } from "../lib/requireAuth.js";
import { getJsonBody } from "../lib/body.js";

function getId(req, body) {
  const q = req.query?.id;
  if (q) return Number(q);
  if (body?.id) return Number(body.id);
  return 0;
}

export default async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const userId = payload.id;

  try {
    // CREATE
    if (req.method === "POST") {
      const body = await getJsonBody(req);
      const name = body?.name?.trim();
      const type = body?.type?.trim() || null;

      if (!name) return res.status(400).json({ error: "Nome do grupo é obrigatório" });

      const r = await pool.query(
        `
        INSERT INTO password_groups (user_id, name, category)
        VALUES ($1, $2, $3)
        RETURNING id, name, category AS type
        `,
        [userId, name, type]
      );

      return res.status(201).json({ success: true, group: r.rows[0] });
    }

    // UPDATE
    if (req.method === "PUT") {
      const body = await getJsonBody(req);
      const id = getId(req, body);
      const name = body?.name?.trim();
      const type = body?.type?.trim() || null;

      if (!id) return res.status(400).json({ error: "ID inválido" });
      if (!name) return res.status(400).json({ error: "Nome do grupo é obrigatório" });

      const check = await pool.query(
        "SELECT id FROM password_groups WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      if (!check.rows.length) return res.status(404).json({ error: "Grupo não encontrado" });

      const r = await pool.query(
        `
        UPDATE password_groups
        SET name = $1, category = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, category AS type
        `,
        [name, type, id]
      );

      return res.status(200).json({ success: true, group: r.rows[0] });
    }

    // DELETE
    if (req.method === "DELETE") {
      const body = await getJsonBody(req);
      const id = getId(req, body);

      if (!id) return res.status(400).json({ error: "ID inválido" });

      const check = await pool.query(
        "SELECT id FROM password_groups WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      if (!check.rows.length) return res.status(404).json({ error: "Grupo não encontrado" });

      await pool.query("DELETE FROM password_groups WHERE id = $1", [id]);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}