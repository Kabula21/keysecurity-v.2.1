import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import { requireAuth } from "../lib/requireAuth.js";
import { getJsonBody } from "../lib/body.js";

export default async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const userId = payload.id;

  try {
    // GET /api/profile
    if (req.method === "GET") {
      const r = await pool.query(
        `
        SELECT
          email, avatar, first_name, last_name, gender, birth_date,
          cep, address, country, state, city, complement
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      if (!r.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

      const u = r.rows[0];
      return res.status(200).json({
        email: u.email,
        avatar: u.avatar,
        nome: u.first_name,
        sobrenome: u.last_name,
        genero: u.gender,
        data_nascimento: u.birth_date,
        cep: u.cep,
        endereco: u.address,
        pais: u.country,
        estado: u.state,
        cidade: u.city,
        complemento: u.complement
      });
    }

    // PUT /api/profile
    if (req.method === "PUT") {
      const body = await getJsonBody(req);

      const {
        email,
        senhaAtual,
        novaSenha,
        nome,
        sobrenome,
        genero,
        data_nascimento,
        cep,
        endereco,
        pais,
        estado,
        cidade,
        complemento
      } = body || {};

      const u0 = await pool.query(
        "SELECT email, password_hash FROM users WHERE id = $1",
        [userId]
      );
      if (!u0.rows.length) return res.status(404).json({ error: "Usuário não encontrado" });

      const current = u0.rows[0];
      let passwordHashFinal = current.password_hash;

      if (novaSenha && String(novaSenha).trim() !== "") {
        if (!senhaAtual) {
          return res.status(400).json({ error: "Informe a senha atual para alterar a senha" });
        }

        const ok = await bcrypt.compare(String(senhaAtual), current.password_hash);
        if (!ok) return res.status(401).json({ error: "Senha atual incorreta" });

        passwordHashFinal = await bcrypt.hash(String(novaSenha), 10);
      }

      await pool.query(
        `
        UPDATE users SET
          email = COALESCE($1, email),
          password_hash = $2,
          first_name = $3,
          last_name = $4,
          gender = $5,
          birth_date = $6,
          cep = $7,
          address = $8,
          country = $9,
          state = $10,
          city = $11,
          complement = $12,
          updated_at = NOW()
        WHERE id = $13
        `,
        [
          email || null,
          passwordHashFinal,
          nome ?? null,
          sobrenome ?? null,
          genero ?? null,
          data_nascimento ?? null,
          cep ?? null,
          endereco ?? null,
          pais ?? null,
          estado ?? null,
          cidade ?? null,
          complemento ?? null,
          userId
        ]
      );

      return res.status(200).json({ success: true });
    }

    // DELETE /api/profile
    if (req.method === "DELETE") {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    // email duplicado (unique)
    if (e?.code === "23505") {
      return res.status(409).json({ error: "Email já está em uso" });
    }
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}