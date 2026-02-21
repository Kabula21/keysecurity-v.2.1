import pool from "../../lib/db.js";
import { requireAuth } from "../../lib/requireAuth.js";
import { getJsonBody } from "../../lib/body.js";

function isAllowedDataUrl(s) {
  return (
    typeof s === "string" &&
    (s.startsWith("data:image/png;base64,") ||
      s.startsWith("data:image/jpeg;base64,") ||
      s.startsWith("data:image/webp;base64,"))
  );
}

function approxBytesFromDataUrl(dataUrl) {
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor((b64.length * 3) / 4); // aproximação
}

export default async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const userId = payload.id;

  try {
    // PUT /api/profile/avatar
    if (req.method === "PUT") {
      const body = await getJsonBody(req);
      const dataUrl = body?.dataUrl;

      if (!isAllowedDataUrl(dataUrl)) {
        return res
          .status(400)
          .json({ error: "Formato inválido. Use PNG, JPG ou WEBP." });
      }

      const bytes = approxBytesFromDataUrl(dataUrl);
      if (bytes > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Imagem acima de 2MB." });
      }

      await pool.query(
        "UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2",
        [dataUrl, userId]
      );

      return res.status(200).json({ success: true, avatar: dataUrl });
    }

    // DELETE /api/profile/avatar
    if (req.method === "DELETE") {
      await pool.query(
        "UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = $1",
        [userId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}