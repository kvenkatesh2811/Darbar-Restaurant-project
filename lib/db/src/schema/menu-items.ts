import { pgTable, text, serial, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  categorySlug: text("category_slug").notNull(),
  isVeg: boolean("is_veg").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, createdAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;
