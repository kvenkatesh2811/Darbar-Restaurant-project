import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const loyaltyProgressTable = pgTable("loyalty_progress", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull().unique(),
  totalCompletedOrders: integer("total_completed_orders").notNull().default(0),
  visitCount: integer("visit_count").notNull().default(0),
  currentProgress: integer("current_progress").notNull().default(0),
  availableRewards: integer("available_rewards").notNull().default(0),
  redeemedRewards: integer("redeemed_rewards").notNull().default(0),
  birthdayDiscountEligibility: boolean("birthday_discount_eligibility").notNull().default(false),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyRewardsTable = pgTable("loyalty_rewards", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  orderId: integer("order_id").references(() => ordersTable.id),
  rewardType: text("reward_type").notNull().default("free_meal"), // 'free_meal', 'visit', 'birthday_email'
  rewardStatus: text("reward_status").notNull().default("available"), // 'available', 'redeemed', 'counted', 'sent'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
});
