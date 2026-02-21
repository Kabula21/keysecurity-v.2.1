import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import { generateToken } from "../lib/auth.js";
import { setAuthCookie } from "../lib/authRequest.js";

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function getJsonBody(req) {
  // 1) já veio parseado
  if (req.body && typeof req.body === "object") return req.body;

  // 2) veio como string
  if (typeof req.body === "string" && req.body.trim() !== "") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  // 3) veio undefined -> lê do stream
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

    const result = await pool.query(
      `
      SELECT id, email, password_hash, first_name, last_name
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = generateToken({ id: user.id, email: user.email });

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
  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message,
    });
  }
}

setAuthCookie(res, token);

return res.status(200).json({
  success: true,
  token, // pode manter por enquanto
  user: {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  }
});