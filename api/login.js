// api/login.js
import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import { generateToken } from "../lib/auth.js";
import { getJsonBody } from "../lib/body.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await getJsonBody(req);
    const email = body?.email?.trim();
    const password = body?.password?.trim();

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET não configurado" });
    }

    const r = await pool.query(
      `
      SELECT id, email, password_hash, first_name, last_name
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (!r.rows.length) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = r.rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = generateToken({ id: user.id, email: user.email });

    // (opcional) se você estiver usando cookie HttpOnly:
    // const maxAge = 60 * 60 * 24 * 7;
    // const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
    // res.setHeader(
    //   "Set-Cookie",
    //   `keysecurity_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure}`
    // );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}