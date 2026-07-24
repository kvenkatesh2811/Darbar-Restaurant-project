import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function initLoyaltyTables() {
  try {
    logger.info("Initializing loyalty rewards database tables...");

    // Create loyalty_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_progress (
        id SERIAL PRIMARY KEY,
        customer_id TEXT UNIQUE NOT NULL,
        total_completed_orders INTEGER NOT NULL DEFAULT 0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        current_progress INTEGER NOT NULL DEFAULT 0,
        available_rewards INTEGER NOT NULL DEFAULT 0,
        redeemed_rewards INTEGER NOT NULL DEFAULT 0,
        birthday_discount_eligibility BOOLEAN NOT NULL DEFAULT FALSE,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create loyalty_rewards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_rewards (
        id SERIAL PRIMARY KEY,
        customer_id TEXT NOT NULL,
        order_id INTEGER,
        reward_type TEXT NOT NULL DEFAULT 'free_meal',
        reward_status TEXT NOT NULL DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        redeemed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS loyalty_progress_customer_idx ON loyalty_progress (customer_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS loyalty_rewards_customer_idx ON loyalty_rewards (customer_id);
    `);

    logger.info("Loyalty database tables initialized successfully.");
  } catch (error) {
    logger.error({ error }, "Failed to initialize loyalty database tables.");
  }
}

export async function initAdminUsersTable() {
  try {
    logger.info("Initializing admin_users database table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        added_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx ON admin_users (LOWER(email));
    `);
    logger.info("admin_users database table initialized successfully.");
  } catch (error) {
    logger.error({ error }, "Failed to initialize admin_users database table.");
  }
}

export default async function initDbTables() {
  await initLoyaltyTables();
  await initAdminUsersTable();
}

