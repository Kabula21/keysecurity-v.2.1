import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import { generateToken } from "../lib/auth.js";

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function getJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string" && req.body.trim() !== "") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const raw = await readRawBody(req);
  if (!raw || raw.trim() === "") return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await getJsonBody(req);
    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    // 1) Tenta schema com password_hash (seu antigo)
    let userRow = null;
    try {
      const r = await pool.query(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        [email]
      );
      userRow = r.rows[0] || null;
      if (userRow) userRow._hash = userRow.password_hash;
    } catch (e) {
      // Se a coluna não existir (42703), tentamos schema alternativo
      if (e?.code !== "42703") throw e;
    }

    // 2) Se não achou (ou schema não bateu), tenta schema com password
    if (!userRow) {
      const r2 = await pool.query(
        "SELECT id, email, password FROM users WHERE email = $1",
        [email]
      );
      userRow = r2.rows[0] || null;
      if (userRow) userRow._hash = userRow.password;
    }

    if (!userRow) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!userRow._hash) {
      return res.status(500).json({
        error: "Erro interno",
        details: "Coluna de senha no usuário está vazia.",
      });
    }

    const ok = await bcrypt.compare(password, userRow._hash);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = generateToken({ id: userRow.id, email: userRow.email });

    return res.status(200).json({
      success: true,
      token,
      user: { id: userRow.id, email: userRow.email },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message,
    });
  }
}