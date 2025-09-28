// pages/api/collect.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve(process.cwd(), "data", "usage-uploads.json");

// NOTE: simple dev-handler. For production: authenticate, rate-limit, use DB.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS for extension/dev — adjust for production
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).end("Only POST");
  }
  try {
    const payload = req.body || {};

    // For basic safety: don't accept huge payloads
    const size = JSON.stringify(payload).length;
    if (size > 2000000) {
      return res.status(413).json({ ok: false, error: "Payload too large" });
    }

    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const existing = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) : [];
    existing.push({ receivedAt: new Date().toISOString(), payload });
    fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2), "utf8");

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("collect save error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
