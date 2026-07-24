import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface UserRoleInfo {
  isAdmin: boolean;
  isOwner: boolean;
  role: "owner" | "admin" | "customer";
  email: string | null;
}

/**
 * Helper to determine detailed role info for a given Clerk user ID.
 * Validates against:
 * 1. Clerk publicMetadata.role ('owner' | 'admin')
 * 2. OWNER_EMAIL / ADMIN_EMAILS environment variables
 * 3. admin_users PostgreSQL table
 */
export async function getUserRoleInfo(userId: string): Promise<UserRoleInfo> {
  if (!userId) {
    logger.info("[Auth Debug] No userId provided in session request.");
    return { isAdmin: false, isOwner: false, role: "customer", email: null };
  }

  try {
    const client = clerkClient;
    const user = await client.users.getUser(userId);

    const primaryEmailObj = user.emailAddresses.find((e: any) => e.id === user.primaryEmailAddressId) || user.emailAddresses[0];
    const email = primaryEmailObj ? primaryEmailObj.emailAddress.toLowerCase().trim() : null;

    const userEmails = user.emailAddresses.map((e: any) => e.emailAddress.toLowerCase().trim());

    logger.info({ userId, email, userEmails }, "[Auth Debug] Retrieved Clerk session user emails");

    const hasAdminEmailsConfig = Boolean(process.env.ADMIN_EMAILS);
    const adminEmailsCount = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim()).filter(Boolean).length : 0;
    logger.info({ hasAdminEmailsConfig, adminEmailsCount }, "[Auth Debug] Backend ADMIN_EMAILS env status");

    // 1. Check OWNER_EMAIL env var (first email in ADMIN_EMAILS or explicit OWNER_EMAIL)
    const ownerEmailConfig = (process.env.OWNER_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "").toLowerCase().trim();
    if (ownerEmailConfig && userEmails.includes(ownerEmailConfig)) {
      logger.info({ email, ownerEmailConfig }, "[Auth Debug] Match found for Owner in ADMIN_EMAILS/OWNER_EMAIL");
      return { isAdmin: true, isOwner: true, role: "owner", email };
    }

    // 2. Check Clerk publicMetadata role
    if (user.publicMetadata?.role === "owner") {
      logger.info({ email }, "[Auth Debug] Match found for Owner in Clerk publicMetadata");
      return { isAdmin: true, isOwner: true, role: "owner", email };
    }
    if (user.publicMetadata?.role === "admin") {
      logger.info({ email }, "[Auth Debug] Match found for Admin in Clerk publicMetadata");
      return { isAdmin: true, isOwner: false, role: "admin", email };
    }

    // 3. Check ADMIN_EMAILS env variable list
    const allowedEmails = process.env.ADMIN_EMAILS;
    if (allowedEmails) {
      const allowedList = allowedEmails.split(",").map((e: string) => e.trim().toLowerCase());
      const hasMatch = userEmails.some((e: string) => allowedList.includes(e));
      if (hasMatch) {
        logger.info({ email }, "[Auth Debug] Match found for Admin in ADMIN_EMAILS list");
        return { isAdmin: true, isOwner: false, role: "admin", email };
      }
    }

    // 4. Query admin_users database table
    if (email) {
      const dbAdmins = await db
        .select()
        .from(adminUsersTable)
        .where(sql`LOWER(${adminUsersTable.email}) = ${email}`);

      if (dbAdmins.length > 0) {
        const dbAdmin = dbAdmins[0];
        const isOwnerRole = dbAdmin.role === "owner";
        logger.info({ email, role: dbAdmin.role }, "[Auth Debug] Match found in admin_users database table");
        return {
          isAdmin: true,
          isOwner: isOwnerRole,
          role: isOwnerRole ? "owner" : "admin",
          email,
        };
      }
    }

    logger.info({ email, userEmails }, "[Auth Debug] User is not authorized as Admin or Owner");
  } catch (error: any) {
    logger.error({ userId, error: error?.message || error }, "[Auth Error] Exception occurred in getUserRoleInfo");
    return { isAdmin: false, isOwner: false, role: "customer", email: null };
  }

  return { isAdmin: false, isOwner: false, role: "customer", email: null };
}

/**
 * Helper to check if a Clerk user ID belongs to an administrator.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const roleInfo = await getUserRoleInfo(userId);
  return roleInfo.isAdmin;
}

/**
 * Helper to check if a Clerk user ID belongs to the Owner / Super Admin.
 */
export async function checkIsOwner(userId: string): Promise<boolean> {
  const roleInfo = await getUserRoleInfo(userId);
  return roleInfo.isOwner;
}

/**
 * Middleware: require a valid authenticated Clerk session with Admin privileges.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized: Sign in required" });
    return;
  }

  const isAdmin = await checkIsAdmin(userId);
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden: Admin privileges required" });
    return;
  }

  next();
}

/**
 * Middleware: require a valid authenticated Clerk session with Owner / Super Admin privileges.
 */
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized: Sign in required" });
    return;
  }

  const isOwner = await checkIsOwner(userId);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden: Owner privileges required" });
    return;
  }

  next();
}


