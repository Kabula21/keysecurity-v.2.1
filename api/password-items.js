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
      const groupId = Number(body?.groupId);
      const username = body?.username?.trim() || null;
      const email = body?.email?.trim() || null;
      const password = body?.password?.trim();
      const note = body?.note?.trim() || null;

      if (!groupId) return res.status(400).json({ error: "groupId é obrigatório" });
      if (!password) return res.status(400).json({ error: "password é obrigatório" });

      const groupCheck = await pool.query(
        "SELECT id FROM password_groups WHERE id = $1 AND user_id = $2",
        [groupId, userId]
      );
      if (!groupCheck.rows.length) return res.status(404).json({ error: "Grupo não encontrado" });

      const r = await pool.query(
        `
        INSERT INTO password_items (group_id, username, email, password, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, group_id, username, email, password, note
        `,
        [groupId, username, email, password, note]
      );

      return res.status(201).json({ success: true, item: r.rows[0] });
    }

    // UPDATE
    if (req.method === "PUT") {
      const body = await getJsonBody(req);
      const id = getId(req, body);

      const username = body?.username?.trim() || null;
      const email = body?.email?.trim() || null;
      const password = body?.password?.trim();
      const note = body?.note?.trim() || null;

      if (!id) return res.status(400).json({ error: "ID inválido" });
      if (!password) return res.status(400).json({ error: "Senha é obrigatória" });

      const check = await pool.query(
        `
        SELECT pi.id
        FROM password_items pi
        JOIN password_groups pg ON pg.id = pi.group_id
        WHERE pi.id = $1 AND pg.user_id = $2
        `,
        [id, userId]
      );
      if (!check.rows.length) return res.status(404).json({ error: "Item não encontrado" });

      const r = await pool.query(
        `
        UPDATE password_items
        SET username = $1, email = $2, password = $3, note = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING id, group_id, username, email, password, note
        `,
        [username, email, password, note, id]
      );

      return res.status(200).json({ success: true, item: r.rows[0] });
    }

    // DELETE
    if (req.method === "DELETE") {
      const body = await getJsonBody(req);
      const id = getId(req, body);

      if (!id) return res.status(400).json({ error: "ID inválido" });

      const check = await pool.query(
        `
        SELECT pi.id
        FROM password_items pi
        JOIN password_groups pg ON pg.id = pi.group_id
        WHERE pi.id = $1 AND pg.user_id = $2
        `,
        [id, userId]
      );
      if (!check.rows.length) return res.status(404).json({ error: "Item não encontrado" });

      await pool.query("DELETE FROM password_items WHERE id = $1", [id]);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}