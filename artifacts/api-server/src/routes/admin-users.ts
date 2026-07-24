import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, adminUsersTable } from "@workspace/db";
import { requireOwner, getUserRoleInfo } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/admin/users - List all authorized admin users (Owner only)
router.get("/admin/users", requireOwner, async (_req, res): Promise<void> => {
  try {
    const dbUsers = await db
      .select()
      .from(adminUsersTable)
      .orderBy(adminUsersTable.createdAt);

    // Also include env-configured emails for full visibility
    const ownerEmailConfig = (process.env.OWNER_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "").toLowerCase().trim();
    const envAdminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const result = [...dbUsers];

    // Append env owner if not present
    if (ownerEmailConfig && !result.some((u) => u.email.toLowerCase() === ownerEmailConfig)) {
      result.unshift({
        id: 0,
        email: ownerEmailConfig,
        role: "owner",
        addedBy: "System (.env)",
        createdAt: new Date(),
      } as any);
    }

    // Append env admins if not present
    for (const envEmail of envAdminEmails) {
      if (envEmail !== ownerEmailConfig && !result.some((u) => u.email.toLowerCase() === envEmail)) {
        result.push({
          id: -1,
          email: envEmail,
          role: "admin",
          addedBy: "System (.env)",
          createdAt: new Date(),
        } as any);
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch admin users" });
  }
});

// POST /api/admin/users - Add a new admin user (Owner only)
router.post("/admin/users", requireOwner, async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    const roleInfo = userId ? await getUserRoleInfo(userId) : null;
    const addedByEmail = roleInfo?.email || "owner";

    const { email, role } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role === "owner" ? "owner" : "admin";

    // Check if already exists in DB
    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(sql`LOWER(${adminUsersTable.email}) = ${cleanEmail}`);

    if (existing.length > 0) {
      res.status(409).json({ error: "This email is already an authorized admin" });
      return;
    }

    const [inserted] = await db
      .insert(adminUsersTable)
      .values({
        email: cleanEmail,
        role: assignedRole,
        addedBy: addedByEmail,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add admin user" });
  }
});

// DELETE /api/admin/users/:id - Revoke admin user (Owner only)
router.delete("/admin/users/:id", requireOwner, async (req, res): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Cannot delete system environment variable admin. Update .env to change system admins." });
      return;
    }

    const [deleted] = await db
      .delete(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Admin user not found" });
      return;
    }

    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove admin user" });
  }
});

export default router;
