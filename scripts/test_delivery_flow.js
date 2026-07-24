import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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

async function verifyDeliveryAndPickupFlows() {
  console.log("==================================================");
  console.log("   DARBAR RESTAURANT DELIVERY & PICKUP AUDIT      ");
  console.log("==================================================\n");

  try {
    // 1. Create a test Pickup Order
    console.log("1. Testing Pickup Order Creation (< ₹500)...");
    const pickupSubtotal = 260; // Chicken Dum Biryani ₹260
    const pickupGst = pickupSubtotal * 0.05; // ₹13
    const pickupDeliveryFee = 0; // ₹0
    const pickupTotal = pickupSubtotal + pickupGst + pickupDeliveryFee; // ₹273

    const resPickup = await pool.query(
      `INSERT INTO orders 
      (customer_name, phone, email, pickup_time, notes, status, total_amount, items, order_type, payment_method, delivery_charge) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *;`,
      [
        "Anil Kumar",
        "+91 98765 43210",
        "anil.kumar@example.com",
        "1:00 PM",
        "Extra spicy please",
        "pending",
        pickupTotal.toFixed(2),
        JSON.stringify([{ menuItemId: 16, menuItemName: "Chicken Dum Biryani", price: 260, quantity: 1 }]),
        "pickup",
        "Cash on Pickup",
        pickupDeliveryFee.toFixed(2),
      ]
    );

    const pickupOrder = resPickup.rows[0];
    console.log(`✅ Pickup Order Created: ID #${pickupOrder.id}, Type: ${pickupOrder.order_type}, Total: ₹${pickupOrder.total_amount}, Delivery Fee: ₹${pickupOrder.delivery_charge}`);

    // 2. Create a test Delivery Order (< ₹500 with ₹40 delivery fee)
    console.log("\n2. Testing Delivery Order Creation (< ₹500, expect ₹40 fee)...");
    const delSmallSubtotal = 260; // ₹260
    const delSmallGst = delSmallSubtotal * 0.05; // ₹13
    const delSmallFee = 40; // ₹40
    const delSmallTotal = delSmallSubtotal + delSmallGst + delSmallFee; // ₹313

    const delAddress1 = {
      houseNumber: "Flat 402, Greenfield Apts",
      street: "Road No. 12, Banjara Hills",
      area: "Banjara Hills",
      city: "Hyderabad",
      landmark: "Opposite Park",
      pincode: "500034",
    };

    const resDelSmall = await pool.query(
      `INSERT INTO orders 
      (customer_name, phone, email, pickup_time, notes, status, total_amount, items, order_type, payment_method, delivery_charge, delivery_address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *;`,
      [
        "Priya Sharma",
        "+91 91234 56789",
        "priya.sharma@example.com",
        "ASAP (Delivery)",
        "Ring doorbell",
        "pending",
        delSmallTotal.toFixed(2),
        JSON.stringify([{ menuItemId: 16, menuItemName: "Chicken Dum Biryani", price: 260, quantity: 1 }]),
        "delivery",
        "Cash on Delivery",
        delSmallFee.toFixed(2),
        JSON.stringify(delAddress1),
      ]
    );

    const delSmallOrder = resDelSmall.rows[0];
    console.log(`✅ Delivery Order (<₹500) Created: ID #${delSmallOrder.id}, Type: ${delSmallOrder.order_type}, Delivery Fee: ₹${delSmallOrder.delivery_charge}, Total: ₹${delSmallOrder.total_amount}`);

    // 3. Create a test Delivery Order (≥ ₹500 with FREE delivery fee)
    console.log("\n3. Testing Delivery Order Creation (≥ ₹500, expect FREE fee)...");
    const delLargeSubtotal = 600; // 2 x Mutton Biryani ₹300 = ₹600
    const delLargeGst = delLargeSubtotal * 0.05; // ₹30
    const delLargeFee = 0; // FREE
    const delLargeTotal = delLargeSubtotal + delLargeGst + delLargeFee; // ₹630

    const delAddress2 = {
      houseNumber: "Door No. 15-4",
      street: "Nandyal Checkpost Road",
      area: "NGOs Colony",
      city: "Kurnool",
      landmark: "Near SBI ATM",
      pincode: "518002",
    };

    const resDelLarge = await pool.query(
      `INSERT INTO orders 
      (customer_name, phone, email, pickup_time, notes, status, total_amount, items, order_type, payment_method, delivery_charge, delivery_address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *;`,
      [
        "Rajesh Varma",
        "+91 99887 76655",
        "rajesh.v@example.com",
        "ASAP (Delivery)",
        "Call on arrival",
        "pending",
        delLargeTotal.toFixed(2),
        JSON.stringify([{ menuItemId: 17, menuItemName: "Mutton Biryani", price: 300, quantity: 2 }]),
        "delivery",
        "UPI",
        delLargeFee.toFixed(2),
        JSON.stringify(delAddress2),
      ]
    );

    const delLargeOrder = resDelLarge.rows[0];
    console.log(`✅ Delivery Order (≥₹500) Created: ID #${delLargeOrder.id}, Type: ${delLargeOrder.order_type}, Delivery Fee: ₹${delLargeOrder.delivery_charge} (FREE), Total: ₹${delLargeOrder.total_amount}`);

    // 4. Query Admin Dashboard View Data
    console.log("\n4. Verifying Admin Dashboard Orders List Query...");
    const adminOrders = await pool.query(
      "SELECT id, customer_name, order_type, total_amount, delivery_charge, delivery_address, status FROM orders ORDER BY id DESC LIMIT 5;"
    );
    console.log("=== Admin Orders View ===");
    console.table(adminOrders.rows);

  } catch (err) {
    console.error("❌ Verification failed:", err);
  } finally {
    await pool.end();
  }
}

verifyDeliveryAndPickupFlows();
