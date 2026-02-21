// lib/body.js
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export async function getJsonBody(req) {
  // já veio parseado
  if (req.body && typeof req.body === "object") return req.body;

  // veio como string
  if (typeof req.body === "string" && req.body.trim() !== "") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  // fallback: ler stream
  const raw = await readRawBody(req);
  if (!raw || raw.trim() === "") return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}