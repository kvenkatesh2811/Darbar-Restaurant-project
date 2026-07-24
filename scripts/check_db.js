import fs from "fs";
import path from "path";
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

const dbUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL:", dbUrl ? dbUrl.replace(/:[^:@]+@/, ":****@") : "NONE");

// Resolve pg
let pg;
try {
  pg = require("pg");
} catch {
  try {
    pg = require("../lib/db/node_modules/pg");
  } catch {
    pg = require("../node_modules/pg");
  }
}

const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl });

async function checkDB() {
  try {
    const resCats = await pool.query("SELECT * FROM categories ORDER BY display_order;");
    console.log("\n=== CATEGORIES TABLE (Count: " + resCats.rowCount + ") ===");
    console.table(resCats.rows);

    const resItems = await pool.query("SELECT * FROM menu_items ORDER BY id;");
    console.log("\n=== MENU_ITEMS TABLE (Count: " + resItems.rowCount + ") ===");
    console.table(resItems.rows.slice(0, 10));

    const resSpecials = await pool.query("SELECT * FROM specials;");
    console.log("\n=== SPECIALS TABLE (Count: " + resSpecials.rowCount + ") ===");
    console.table(resSpecials.rows);
  } catch (err) {
    console.error("Database Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkDB();
