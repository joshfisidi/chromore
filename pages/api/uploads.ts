// pages/api/uploads.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve(process.cwd(), "data", "usage-uploads.json");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(200).json([]);
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("uploads read error", err);
    return res.status(500).json({ error: String(err) });
  }
}
