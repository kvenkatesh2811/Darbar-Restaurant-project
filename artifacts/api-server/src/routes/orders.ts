import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const query = db.select().from(ordersTable);

  const orders = parsed.data.status
    ? await query.where(eq(ordersTable.status, parsed.data.status)).orderBy(ordersTable.createdAt)
    : await query.orderBy(ordersTable.createdAt);

  res.json(
    orders.map((o) => ({
      ...o,
      totalAmount: parseFloat(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const GST_RATE = 0.05;
  const subtotal = parsed.data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const totalAmount = subtotal * (1 + GST_RATE);

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      pickupTime: parsed.data.pickupTime,
      notes: parsed.data.notes,
      status: "pending",
      totalAmount: String(totalAmount),
      items: parsed.data.items,
    })
    .returning();

  res.status(201).json({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
  });
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
  });
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;
