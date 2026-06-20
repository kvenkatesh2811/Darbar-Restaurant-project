import { Router, type IRouter } from "express";
import { eq, count, avg, sql } from "drizzle-orm";
import { db, ordersTable, reviewsTable, leadsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [orderStats] = await db
    .select({
      total: count(),
      pending: count(sql`CASE WHEN ${ordersTable.status} = 'pending' THEN 1 END`),
      today: count(
        sql`CASE WHEN DATE(${ordersTable.createdAt}) = CURRENT_DATE THEN 1 END`,
      ),
    })
    .from(ordersTable);

  const [reviewStats] = await db
    .select({
      total: count(),
      avgRating: avg(reviewsTable.rating),
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.isApproved, true));

  const [leadStats] = await db
    .select({ total: count() })
    .from(leadsTable);

  res.json({
    totalOrders: Number(orderStats?.total ?? 0),
    totalLeads: Number(leadStats?.total ?? 0),
    totalReviews: Number(reviewStats?.total ?? 0),
    pendingOrders: Number(orderStats?.pending ?? 0),
    averageRating: parseFloat(String(reviewStats?.avgRating ?? "4.7")),
    todayOrders: Number(orderStats?.today ?? 0),
  });
});

router.get("/stats/popular-items", async (_req, res): Promise<void> => {
  const orders = await db.select({ items: ordersTable.items }).from(ordersTable);

  const itemCounts = new Map<
    number,
    { name: string; count: number; categoryName: string }
  >();

  for (const order of orders) {
    for (const item of order.items as Array<{
      menuItemId: number;
      menuItemName: string;
      quantity: number;
      price: number;
    }>) {
      const existing = itemCounts.get(item.menuItemId);
      if (existing) {
        existing.count += item.quantity;
      } else {
        itemCounts.set(item.menuItemId, {
          name: item.menuItemName,
          count: item.quantity,
          categoryName: "Menu",
        });
      }
    }
  }

  const result = Array.from(itemCounts.entries())
    .map(([id, data]) => ({
      menuItemId: id,
      name: data.name,
      orderCount: data.count,
      categoryName: data.categoryName,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10);

  res.json(result);
});

export default router;
