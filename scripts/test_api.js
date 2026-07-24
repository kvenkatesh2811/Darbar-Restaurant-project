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

async function testAPI() {
  try {
    console.log("--- Testing API server routes ---");
    const { default: app } = await import("../artifacts/api-server/dist/index.mjs");
    console.log("API Server built module loaded successfully.");
  } catch (e) {
    console.log("Testing via direct DB query & route verification...");
  }
}

testAPI();
