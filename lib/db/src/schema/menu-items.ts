import { pgTable, text, serial, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  categorySlug: text("category_slug").notNull(),
  isVeg: boolean("is_veg").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  imageUrl: text("image_url"),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("4.2"),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(20),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, createdAt: true }) as any;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;
