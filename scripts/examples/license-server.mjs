#!/usr/bin/env node
/**
 * Minimal license API for Stealth GitHub (Option B).
 *
 *   export LICENSE_KEYS="key-one,key-two"
 *   node scripts/examples/license-server.mjs
 *
 * Extension setting: stealth.licenseApiUrl = "http://127.0.0.1:3920"
 */
import http from "node:http";

const PORT = Number(process.env.LICENSE_PORT ?? 3920);
const validKeys = new Set(
  (process.env.LICENSE_KEYS ?? "demo-pro-key")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
);

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/validate") {
    const auth = req.headers.authorization ?? "";
    const key = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    let body = {};
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      // optional JSON body
    }
    const licenseKey = key || body.licenseKey || "";
    const valid = validKeys.has(licenseKey);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        valid,
        expiresAt: valid ? null : undefined,
        message: valid ? undefined : "Invalid license key",
      })
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`License API http://127.0.0.1:${PORT}/validate`);
  console.log(`Valid keys: ${[...validKeys].join(", ")}`);
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
