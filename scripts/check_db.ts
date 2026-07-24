import dotenv from "dotenv";
dotenv.config();
import { db, menuItemsTable, categoriesTable, specialsTable } from "../lib/db/src";

async function check() {
  console.log("Checking DB Connection and Data...");
  try {
    const cats = await db.select().from(categoriesTable);
    console.log("=== CATEGORIES ===");
    console.log("Count:", cats.length);
    console.log(cats);

    const items = await db.select().from(menuItemsTable);
    console.log("=== MENU ITEMS ===");
    console.log("Count:", items.length);
    console.log(items.slice(0, 10));

    const specials = await db.select().from(specialsTable);
    console.log("=== SPECIALS ===");
    console.log("Count:", specials.length);
    console.log(specials);
  } catch (err) {
    console.error("DB connection/query error:", err);
  }
  process.exit(0);
}

check();
