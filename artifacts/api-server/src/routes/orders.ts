import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import { db, ordersTable, leadsTable, loyaltyProgressTable, loyaltyRewardsTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "../lib/email";
import { requireAuth, checkIsAdmin } from "../middlewares/requireAuth";


const router: IRouter = Router();

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const auth = getAuth(req);
  const userId = auth?.userId;

  // Security Check: If query specifies customerId, user can view their own orders or Admin can view any.
  // If no customerId specified (system-wide listing), strictly require Admin.
  if (parsed.data.customerId) {
    const isAdmin = userId ? await checkIsAdmin(userId) : false;
    if (parsed.data.customerId !== userId && !isAdmin) {
      res.status(403).json({ error: "Forbidden: Cannot view orders of another user" });
      return;
    }
  } else {
    const isAdmin = userId ? await checkIsAdmin(userId) : false;
    if (!isAdmin) {
      res.status(403).json({ error: "Forbidden: Admin access required to list all orders" });
      return;
    }
  }

  const conditions = [
    parsed.data.status ? eq(ordersTable.status, parsed.data.status) : undefined,
    parsed.data.customerId ? eq(ordersTable.customerId, parsed.data.customerId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  const orders =
    conditions.length > 0
      ? await db
          .select()
          .from(ordersTable)
          .where(and(...conditions))
          .orderBy(desc(ordersTable.createdAt))
      : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

  res.json(
    orders.map((o) => ({
      ...o,
      totalAmount: parseFloat(o.totalAmount),
      deliveryCharge: parseFloat(o.deliveryCharge),
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

  const customerId = parsed.data.customerId;
  const email = parsed.data.email;

  // 1. Fetch Birthday Date of Birth & check eligibility
  let dobStr: string | null = null;
  if (customerId) {
    try {
      const client = clerkClient;
      const user = await client.users.getUser(customerId);
      dobStr = (user.unsafeMetadata?.dateOfBirth as string) || null;
    } catch {
      // ignore Clerk error
    }
  }

  if (!dobStr && email) {
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.email, email));
    if (lead?.dateOfBirth) {
      dobStr = lead.dateOfBirth;
    }
  }

  let isBirthdayToday = false;
  if (dobStr) {
    const dob = new Date(dobStr);
    const today = new Date();
    isBirthdayToday =
      dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  }

  // Security Check: Verify if customer has already claimed a birthday discount in current calendar year
  if (isBirthdayToday && (customerId || email)) {
    const currentYear = new Date().getFullYear();
    const idToSearch = customerId || email;
    const [alreadyClaimed] = await db
      .select()
      .from(loyaltyRewardsTable)
      .where(
        and(
          eq(loyaltyRewardsTable.customerId, idToSearch),
          eq(loyaltyRewardsTable.rewardType, "birthday_discount_claimed"),
          sql`EXTRACT(YEAR FROM ${loyaltyRewardsTable.createdAt}) = ${currentYear}`
        )
      );

    if (alreadyClaimed) {
      isBirthdayToday = false; // Prevent duplicate birthday discount in same year
    }
  }

  // 2. Check Loyalty Progress for Free Meal Reward
  let hasAvailableReward = false;
  let progressRecord: any = null;
  if (customerId) {
    const [record] = await db
      .select()
      .from(loyaltyProgressTable)
      .where(eq(loyaltyProgressTable.customerId, customerId));
    progressRecord = record;
    if (progressRecord && progressRecord.availableRewards > 0) {
      hasAvailableReward = true;
    }
  }

  const redeemReward = req.body.redeemReward === true && hasAvailableReward;

  // Calculate discounts
  const subtotal = parsed.data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  let loyaltyDiscount = 0;
  if (redeemReward) {
    // Reward makes the highest-priced single item in the order free
    loyaltyDiscount = Math.max(...parsed.data.items.map((item) => item.price));
  }

  const discountedSubtotalForBirthday = subtotal - loyaltyDiscount;
  const birthdayDiscount = isBirthdayToday ? discountedSubtotalForBirthday * 0.10 : 0;
  const totalDiscount = loyaltyDiscount + birthdayDiscount;
  const taxableSubtotal = Math.max(0, subtotal - totalDiscount);

  const GST_RATE = 0.05;
  const gst = taxableSubtotal * GST_RATE;

  const deliveryCharge = parsed.data.orderType === "delivery" ? (parsed.data.deliveryCharge ?? 0) : 0;
  const totalAmount = taxableSubtotal + gst + deliveryCharge;

  // Compile notes with summary
  let notes = parsed.data.notes || "";
  if (loyaltyDiscount > 0 || birthdayDiscount > 0) {
    const breakdown = `\n[Reward Summary - Subtotal: ₹${subtotal}, Loyalty Discount: -₹${loyaltyDiscount}, Birthday Discount: -₹${birthdayDiscount.toFixed(0)}, GST: ₹${gst.toFixed(0)}, Delivery: ₹${deliveryCharge}]`;
    notes += (notes ? "\n" : "") + breakdown;
  }


  const [order] = await db
    .insert(ordersTable)
    .values({
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      pickupTime: parsed.data.pickupTime,
      notes: notes,
      status: "pending",
      totalAmount: String(totalAmount),
      items: parsed.data.items,
      orderType: parsed.data.orderType,
      paymentMethod: parsed.data.paymentMethod,
      deliveryCharge: String(deliveryCharge),
      deliveryAddress: parsed.data.deliveryAddress ?? null,
      customerId: customerId || null,
    })
    .returning();

  // Record birthday discount claim to prevent abuse in same year
  if (birthdayDiscount > 0 && (customerId || email)) {
    await db
      .insert(loyaltyRewardsTable)
      .values({
        customerId: customerId || email,
        orderId: order.id,
        rewardType: "birthday_discount_claimed",
        rewardStatus: "redeemed",
        redeemedAt: new Date(),
      });
  }

  // Deduct reward from progress
  if (redeemReward && customerId && progressRecord) {
    await db
      .update(loyaltyProgressTable)
      .set({
        availableRewards: progressRecord.availableRewards - 1,
        redeemedRewards: progressRecord.redeemedRewards + 1,
        lastUpdated: new Date(),
      })
      .where(eq(loyaltyProgressTable.customerId, customerId));

    await db
      .insert(loyaltyRewardsTable)
      .values({
        customerId: customerId,
        orderId: order.id,
        rewardType: "free_meal",
        rewardStatus: "redeemed",
        redeemedAt: new Date(),
      });
  }

  // Send email confirmation in the background
  sendOrderConfirmationEmail(order, req);

  res.status(201).json({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    deliveryCharge: parseFloat(order.deliveryCharge),
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
    deliveryCharge: parseFloat(order.deliveryCharge),
    createdAt: order.createdAt.toISOString(),
  });
});

const DELIVERY_PARTNERS = [
  { name: "Ravi Kumar", phone: "+91 98450 11223", vehicleNumber: "TS 09 EQ 4521" },
  { name: "Arjun Reddy", phone: "+91 99887 66554", vehicleNumber: "TS 07 FA 8890" },
  { name: "Suresh Naik", phone: "+91 91234 55678", vehicleNumber: "TS 10 GB 3342" },
];

router.patch("/orders/:id", requireAuth, async (req, res): Promise<void> => {
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

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const assignDeliveryPartner =
    parsed.data.status === "out_for_delivery" && existing.orderType === "delivery" && !existing.deliveryPartner;

  const [order] = await db
    .update(ordersTable)
    .set({
      status: parsed.data.status,
      ...(assignDeliveryPartner
        ? { deliveryPartner: DELIVERY_PARTNERS[existing.id % DELIVERY_PARTNERS.length] }
        : {}),
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Update loyalty progress upon order completion
  if (parsed.data.status === "completed") {
    try {
      const [alreadyCounted] = await db
        .select()
        .from(loyaltyRewardsTable)
        .where(
          and(
            eq(loyaltyRewardsTable.orderId, order.id),
            eq(loyaltyRewardsTable.rewardType, "visit")
          )
        );

      if (!alreadyCounted && order.customerId) {
        // 1. Log visit in loyalty_rewards
        await db
          .insert(loyaltyRewardsTable)
          .values({
            customerId: order.customerId,
            orderId: order.id,
            rewardType: "visit",
            rewardStatus: "counted",
          });

        // 2. Fetch loyalty progress
        let [progress] = await db
          .select()
          .from(loyaltyProgressTable)
          .where(eq(loyaltyProgressTable.customerId, order.customerId));

        if (!progress) {
          [progress] = await db
            .insert(loyaltyProgressTable)
            .values({
              customerId: order.customerId,
              totalCompletedOrders: 0,
              visitCount: 0,
              currentProgress: 0,
              availableRewards: 0,
              redeemedRewards: 0,
              birthdayDiscountEligibility: false,
            })
            .returning();
        }

        // 3. Update stats
        let newProgress = progress.currentProgress + 1;
        let newAvailableRewards = progress.availableRewards;

        if (newProgress >= 10) {
          newProgress = 0; // Reset progress
          newAvailableRewards += 1; // Earn free meal reward

          // Insert new available reward record
          await db
            .insert(loyaltyRewardsTable)
            .values({
              customerId: order.customerId,
              rewardType: "free_meal",
              rewardStatus: "available",
            });
        }

        await db
          .update(loyaltyProgressTable)
          .set({
            totalCompletedOrders: progress.totalCompletedOrders + 1,
            visitCount: progress.visitCount + 1,
            currentProgress: newProgress,
            availableRewards: newAvailableRewards,
            lastUpdated: new Date(),
          })
          .where(eq(loyaltyProgressTable.customerId, order.customerId));
      }
    } catch (err) {
      req.log.error(err, "Failed to update loyalty progress on completed order");
    }
  }

  // Send status update email if the status actually changed
  if (existing.status !== parsed.data.status) {
    sendOrderStatusUpdateEmail(order, existing.status, parsed.data.status, req);
  }

  res.json({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    deliveryCharge: parseFloat(order.deliveryCharge),
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;
