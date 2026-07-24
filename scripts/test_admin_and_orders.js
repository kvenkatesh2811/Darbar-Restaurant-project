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

// Set sample ADMIN_EMAILS if not present or expand to test multiple emails
process.env.ADMIN_EMAILS = "owner@darbar.com, manager@darbar.com, ADMIN@DARBAR.COM";

let pg;
try {
  pg = require("pg");
} catch {
  pg = require("../lib/db/node_modules/pg");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function checkAdminEmailAccess(emailToTest) {
  const allowedEmails = process.env.ADMIN_EMAILS || "";
  const allowedList = allowedEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const testEmailClean = emailToTest.trim().toLowerCase();
  return allowedList.includes(testEmailClean);
}

async function runEndToEndVerification() {
  console.log("==================================================");
  console.log("   ADMIN ACCESS & ORDER FULFILLMENT VERIFICATION  ");
  console.log("==================================================\n");

  try {
    // 1. Verify ADMIN_EMAILS multi-email logic
    console.log("1. Testing Multi-Email Admin Authorization Logic...");
    const test1 = checkAdminEmailAccess("owner@darbar.com");
    const test2 = checkAdminEmailAccess(" manager@darbar.com ");
    const test3 = checkAdminEmailAccess("admin@darbar.com");
    const test4 = checkAdminEmailAccess("customer@example.com");

    console.log(` - owner@darbar.com: ${test1 ? "ALLOWED (PASS)" : "DENIED (FAIL)"}`);
    console.log(` - manager@darbar.com (with whitespace): ${test2 ? "ALLOWED (PASS)" : "DENIED (FAIL)"}`);
    console.log(` - ADMIN@DARBAR.COM (case-insensitive): ${test3 ? "ALLOWED (PASS)" : "DENIED (FAIL)"}`);
    console.log(` - customer@example.com (normal customer): ${!test4 ? "BLOCKED (PASS)" : "ALLOWED (FAIL)"}`);

    // 2. Test Single Item Delivery Order
    console.log("\n2. Testing Single Item Delivery Order saving...");
    const singleItem = [{ menuItemId: 16, menuItemName: "Chicken Dum Biryani", price: 260, quantity: 1 }];
    const singleSubtotal = 260;
    const singleGst = singleSubtotal * 0.05;
    const singleFee = 40;
    const singleTotal = singleSubtotal + singleGst + singleFee; // 313

    const delAddressSingle = {
      houseNumber: "12-34",
      street: "Main Road",
      area: "NGOs Colony",
      city: "Kurnool",
      state: "Andhra Pradesh",
      pincode: "518001",
      landmark: "Near SBI Bank",
    };

    const resSingle = await pool.query(
      `INSERT INTO orders 
      (customer_name, phone, email, pickup_time, notes, status, total_amount, items, order_type, payment_method, delivery_charge, delivery_address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *;`,
      [
        "John Doe",
        "+91 98450 11223",
        "john@example.com",
        "ASAP (Delivery)",
        "Please call before delivery.",
        "pending",
        singleTotal.toFixed(2),
        JSON.stringify(singleItem),
        "delivery",
        "Cash on Delivery",
        singleFee.toFixed(2),
        JSON.stringify(delAddressSingle),
      ]
    );
    const orderSingle = resSingle.rows[0];
    console.log(`✅ Single Item Order Saved: Order #${orderSingle.id}, Type: ${orderSingle.order_type}, Total: ₹${orderSingle.total_amount}`);

    // 3. Test Multiple Items Order
    console.log("\n3. Testing Multiple Items Delivery Order saving...");
    const multiItems = [
      { menuItemId: 16, menuItemName: "Chicken Dum Biryani", price: 260, quantity: 1 },
      { menuItemId: 14, menuItemName: "Butter Naan", price: 45, quantity: 2 },
      { menuItemId: 9, menuItemName: "Rayalaseema Spicy Chicken Curry", price: 340, quantity: 1 },
    ];
    const multiSubtotal = 260 + 90 + 340; // 690
    const multiGst = multiSubtotal * 0.05; // 34.50
    const multiFee = 0; // FREE (>= 500)
    const multiTotal = multiSubtotal + multiGst + multiFee; // 724.50

    const delAddressMulti = {
      houseNumber: "Flat 501",
      street: "Gowri Shankar Nagar",
      area: "Kurnool",
      city: "Kurnool",
      state: "Andhra Pradesh",
      pincode: "518002",
      landmark: "Behind Reliance Digital",
    };

    const resMulti = await pool.query(
      `INSERT INTO orders 
      (customer_name, phone, email, pickup_time, notes, status, total_amount, items, order_type, payment_method, delivery_charge, delivery_address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *;`,
      [
        "Suresh Naidu",
        "+91 97000 88999",
        "suresh.n@example.com",
        "ASAP (Delivery)",
        "Leave at reception",
        "pending",
        multiTotal.toFixed(2),
        JSON.stringify(multiItems),
        "delivery",
        "UPI",
        multiFee.toFixed(2),
        JSON.stringify(delAddressMulti),
      ]
    );
    const orderMulti = resMulti.rows[0];
    console.log(`✅ Multi Item Order Saved: Order #${orderMulti.id}, Items: ${multiItems.length}, Total: ₹${orderMulti.total_amount}`);

    // 4. Test Updating Status to Confirmed
    console.log("\n4. Testing Order Status Update (pending -> confirmed)...");
    const updateRes = await pool.query(
      "UPDATE orders SET status = 'confirmed' WHERE id = $1 RETURNING id, status, customer_name;",
      [orderSingle.id]
    );
    console.log(`✅ Status Updated for Order #${updateRes.rows[0].id}: New Status -> '${updateRes.rows[0].status}'`);

    // 5. Query Admin Orders View Payload
    console.log("\n5. Querying Database for Admin Panel Visibility...");
    const adminQuery = await pool.query(
      "SELECT id, customer_name, email, phone, order_type, total_amount, delivery_charge, status, delivery_address, items FROM orders WHERE id IN ($1, $2);",
      [orderSingle.id, orderMulti.id]
    );
    console.log("=== Admin View Dataset ===");
    console.log(JSON.stringify(adminQuery.rows, null, 2));

  } catch (err) {
    console.error("❌ E2E test failed:", err);
  } finally {
    await pool.end();
  }
}

runEndToEndVerification();
