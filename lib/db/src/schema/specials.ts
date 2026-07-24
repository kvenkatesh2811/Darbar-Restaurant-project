import { pgTable, text, serial, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const specialsTable = pgTable("specials", {
  id: serial("id").primaryKey(),
  dishName: text("dish_name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpecialSchema = createInsertSchema(specialsTable).omit({ id: true, createdAt: true }) as any;
export type InsertSpecial = z.infer<typeof insertSpecialSchema>;
export type Special = typeof specialsTable.$inferSelect;
