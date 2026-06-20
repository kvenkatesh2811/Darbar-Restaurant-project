import { pgTable, text, serial, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  pickupTime: text("pickup_time").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  items: jsonb("items").notNull().$type<Array<{ menuItemId: number; menuItemName: string; quantity: number; price: number }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, status: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
