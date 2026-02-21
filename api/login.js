// api/login.js (modo DEBUG anti-crash)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // imports dentro do try => se falhar, volta JSON (não crasha a function)
    const pool = (await import("../lib/db.js")).default;
    const bcrypt = (await import("bcrypt")).default;
    const { generateToken } = await import("../lib/auth.js");

    // ler body (se vier vazio/undefined, não quebra)
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    let body = {};
    try {
      body = raw ? JSON.parse(raw) : (req.body || {});
    } catch {
      body = req.body || {};
    }

    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name
       FROM users
       WHERE email = $1`,
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
  } catch (e) {
    console.error("FATAL /api/login:", e);
    return res.status(500).json({
      error: "Erro interno",
      details: e?.message || String(e),
    });
  }
}