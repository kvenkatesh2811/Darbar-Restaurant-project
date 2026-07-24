import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Parse .env manually
const envPath = "k:/VenkyData/Darbar-Restaurant/.env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

let pg;
try {
  pg = require("pg");
} catch {
  pg = require("../lib/db/node_modules/pg");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditBackend() {
  console.log("=== 1. BACKEND DB & TABLE AUDIT ===");
  try {
    const tables = [
      "categories", "menu_items", "specials", "reviews", 
      "feedback", "leads", "orders", "loyalty_progress", "loyalty_rewards"
    ];
    for (const table of tables) {
      const res = await pool.query(`SELECT count(*) FROM ${table};`);
      console.log(`Table '${table}': ${res.rows[0].count} records`);
    }

    console.log("\n=== Checking Sample Menu Items Data Fields ===");
    const itemsRes = await pool.query("SELECT id, name, price, category_slug, is_veg, is_available, image_url, rating, is_bestseller FROM menu_items LIMIT 3;");
    console.table(itemsRes.rows);

    console.log("\n=== Checking Specials Data Fields ===");
    const specialsRes = await pool.query("SELECT * FROM specials;");
    console.table(specialsRes.rows);

  } catch (err) {
    console.error("Backend audit error:", err);
  } finally {
    await pool.end();
  }
}

auditBackend();
