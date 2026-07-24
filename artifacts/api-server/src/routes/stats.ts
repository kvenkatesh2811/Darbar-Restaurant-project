import { Router, type IRouter } from "express";
import { eq, count, avg, sum, sql } from "drizzle-orm";
import { db, ordersTable, reviewsTable, leadsTable, loyaltyProgressTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { requireAuth, checkIsAdmin, getUserRoleInfo } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/check-status", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.json({ isAdmin: false, isOwner: false, role: "customer", email: null });
    return;
  }
  const roleInfo = await getUserRoleInfo(userId);
  res.json(roleInfo);
});

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [orderStats] = await db
    .select({
      total: count(),
      pending: count(sql`CASE WHEN ${ordersTable.status} = 'pending' THEN 1 END`),
      completed: count(sql`CASE WHEN ${ordersTable.status} = 'completed' THEN 1 END`),
      cancelled: count(sql`CASE WHEN ${ordersTable.status} = 'cancelled' THEN 1 END`),
      revenue: sum(sql`CASE WHEN ${ordersTable.status} = 'completed' THEN ${ordersTable.totalAmount}::numeric ELSE 0 END`),
      avgValue: avg(sql`CASE WHEN ${ordersTable.status} = 'completed' THEN ${ordersTable.totalAmount}::numeric END`),
      totalCustomers: count(sql`DISTINCT ${ordersTable.customerId}`),
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

  const [loyaltyStats] = await db
    .select({
      totalRewards: sum(loyaltyProgressTable.availableRewards),
    })
    .from(loyaltyProgressTable);

  const leads = await db.select().from(leadsTable);
  const getDaysUntilBirthday = (dobStr: string): number => {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return 999;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBirthday.getTime() < todayMidnight.getTime()) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBirthday.getTime() - todayMidnight.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === -0 ? 0 : diffDays;
  };
  
  const upcomingBirthdays = leads.filter(l => {
    if (!l.dateOfBirth) return false;
    const days = getDaysUntilBirthday(l.dateOfBirth);
    return days >= 0 && days <= 30;
  }).length;

  res.json({
    totalOrders: Number(orderStats?.total ?? 0),
    totalLeads: Number(leadStats?.total ?? 0),
    totalReviews: Number(reviewStats?.total ?? 0),
    pendingOrders: Number(orderStats?.pending ?? 0),
    completedOrders: Number(orderStats?.completed ?? 0),
    cancelledOrders: Number(orderStats?.cancelled ?? 0),
    totalRevenue: parseFloat(String(orderStats?.revenue ?? "0")),
    averageOrderValue: parseFloat(String(orderStats?.avgValue ?? "0")),
    totalCustomers: Number(orderStats?.totalCustomers ?? 0),
    averageRating: parseFloat(String(reviewStats?.avgRating ?? "4.7")),
    todayOrders: Number(orderStats?.today ?? 0),
    availableLoyaltyRewards: Number(loyaltyStats?.totalRewards ?? 0),
    upcomingBirthdays: upcomingBirthdays,
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

router.get("/stats/daily-revenue", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      date: sql<string>`DATE(${ordersTable.createdAt})::text`,
      revenue: sum(ordersTable.totalAmount),
      orders: count(),
    })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt} >= CURRENT_DATE - INTERVAL '6 days'`)
    .groupBy(sql`DATE(${ordersTable.createdAt})`)
    .orderBy(sql`DATE(${ordersTable.createdAt})`);

  // Fill in missing days with 0 so the chart always shows 7 bars
  const result: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = rows.find(r => r.date === dateStr);
    result.push({
      date: dateStr,
      revenue: found ? parseFloat(String(found.revenue ?? "0")) : 0,
      orders: found ? Number(found.orders) : 0,
    });
  }

  res.json(result);
});

export default router;
