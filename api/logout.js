// api/logout.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `keysecurity_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`
  );

  return res.status(200).json({ success: true });
}