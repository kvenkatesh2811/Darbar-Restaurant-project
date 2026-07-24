import { pgTable, text, serial, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  pickupTime: text("pickup_time").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  items: jsonb("items").notNull().$type<Array<{ menuItemId: number; menuItemName: string; quantity: number; price: number }>>(),
  orderType: text("order_type").notNull().default("pickup"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryAddress: jsonb("delivery_address").$type<{
    houseNumber: string;
    street: string;
    area: string;
    city: string;
    landmark?: string;
    pincode: string;
  } | null>(),
  customerId: text("customer_id"),
  deliveryPartner: jsonb("delivery_partner").$type<{
    name: string;
    phone: string;
    vehicleNumber: string;
  } | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, status: true, deliveryPartner: true }) as any;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
