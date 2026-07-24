import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import {
  db,
  leadsTable,
  loyaltyProgressTable,
  loyaltyRewardsTable,
  ordersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Helper to get days until birthday
function getDaysUntilBirthday(dobStr: string): number {
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return 999;
  const today = new Date();
  
  // Normalize dates to midnight for accurate day calculations
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  
  if (nextBirthday.getTime() < todayMidnight.getTime()) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = nextBirthday.getTime() - todayMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === -0 ? 0 : diffDays;
}

// ── GET /api/loyalty ──────────────────────────────────────────────────────────
// Retrieve customer loyalty profile & available rewards
router.get("/loyalty", async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // 1. Get or initialize loyalty progress
    let [progress] = await db
      .select()
      .from(loyaltyProgressTable)
      .where(eq(loyaltyProgressTable.customerId, userId));

    if (!progress) {
      [progress] = await db
        .insert(loyaltyProgressTable)
        .values({
          customerId: userId,
          totalCompletedOrders: 0,
          visitCount: 0,
          currentProgress: 0,
          availableRewards: 0,
          redeemedRewards: 0,
          birthdayDiscountEligibility: false,
        })
        .returning();
    }

    // 2. Fetch birthday discount eligibility from Clerk or Leads table
    let dobStr: string | null = null;
    
    // Check Clerk Metadata
    try {
      const client = clerkClient;
      const user = await client.users.getUser(userId);
      dobStr = (user.unsafeMetadata?.dateOfBirth as string) || null;
      
      if (!dobStr) {
        // Fallback to Lead record by email
        const primaryEmail = user.emailAddresses.find(
          (e: any) => e.id === user.primaryEmailAddressId
        )?.emailAddress;
        
        if (primaryEmail) {
          const [lead] = await db
            .select()
            .from(leadsTable)
            .where(eq(leadsTable.email, primaryEmail));
          
          if (lead?.dateOfBirth) {
            dobStr = lead.dateOfBirth;
          }
        }
      }
    } catch {
      // Ignore Clerk API failures
    }

    let isBirthdayToday = false;
    if (dobStr) {
      const dob = new Date(dobStr);
      const today = new Date();
      isBirthdayToday =
        dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
    }

    // Sync birthday eligibility in database if changed
    if (progress.birthdayDiscountEligibility !== isBirthdayToday) {
      [progress] = await db
        .update(loyaltyProgressTable)
        .set({
          birthdayDiscountEligibility: isBirthdayToday,
          lastUpdated: new Date(),
        })
        .where(eq(loyaltyProgressTable.customerId, userId))
        .returning();
    }

    // 3. Fetch rewards list
    const rewards = await db
      .select()
      .from(loyaltyRewardsTable)
      .where(
        and(
          eq(loyaltyRewardsTable.customerId, userId),
          eq(loyaltyRewardsTable.rewardType, "free_meal")
        )
      );

    res.json({
      progress,
      rewards,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/birthdays ──────────────────────────────────────────────────
// List customers with birthdays in upcoming 30 days (Admin Only)
router.get("/admin/birthdays", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = await db.select().from(leadsTable);
    
    const upcomingBirthdays = leads
      .filter((lead) => {
        if (!lead.dateOfBirth) return false;
        const days = getDaysUntilBirthday(lead.dateOfBirth);
        return days >= 0 && days <= 30;
      })
      .map((lead) => {
        const days = getDaysUntilBirthday(lead.dateOfBirth!);
        return {
          id: lead.id,
          name: lead.name,
          dateOfBirth: lead.dateOfBirth,
          phone: lead.phone || "N/A",
          email: lead.email,
          daysUntil: days,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json(upcomingBirthdays);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/admin/customers ──────────────────────────────────────────────────
// List customers and their loyalty status (Admin Only)
router.get("/admin/customers", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const loyaltyProfiles = await db.select().from(loyaltyProgressTable);
    const client = clerkClient;
    const response = await client.users.getUserList({ limit: 100 });
    const users = response.data;

    const customersList = [];

    for (const user of users) {
      const progress = loyaltyProfiles.find(p => p.customerId === user.id) || {
        totalCompletedOrders: 0,
        visitCount: 0,
        currentProgress: 0,
        availableRewards: 0,
        redeemedRewards: 0,
        birthdayDiscountEligibility: false
      };

      const userOrders = await db
        .select({
          totalAmount: ordersTable.totalAmount,
          status: ordersTable.status,
        })
        .from(ordersTable)
        .where(eq(ordersTable.customerId, user.id));

      const completedOrders = userOrders.filter(o => o.status === "completed");
      const totalSpending = completedOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

      const primaryEmail = user.emailAddresses.find(
        (e: any) => e.id === user.primaryEmailAddressId
      )?.emailAddress ?? "";

      const primaryPhone = user.phoneNumbers.find(
        (p: any) => p.id === user.primaryPhoneNumberId
      )?.phoneNumber ?? "";

      customersList.push({
        id: user.id,
        name: user.fullName || "Valued Customer",
        email: primaryEmail,
        phone: primaryPhone,
        dateOfBirth: (user.unsafeMetadata?.dateOfBirth as string) || "—",
        totalOrders: userOrders.length,
        completedOrdersCount: completedOrders.length,
        totalSpending,
        currentProgress: progress.currentProgress,
        availableRewards: progress.availableRewards,
        redeemedRewards: progress.redeemedRewards,
        birthdayEligibility: progress.birthdayDiscountEligibility,
      });
    }

    res.json(customersList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
