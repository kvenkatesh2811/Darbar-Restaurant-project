import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, isApproved: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
