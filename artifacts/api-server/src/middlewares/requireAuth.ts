import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware: require a valid Clerk session.
 *
 * If ADMIN_EMAILS is set (comma-separated list of email addresses), access is
 * further restricted to those accounts.  If ADMIN_EMAILS is not set, any
 * authenticated Clerk user is allowed — useful during initial setup before the
 * owner has noted their Clerk email.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const allowedEmails = process.env.ADMIN_EMAILS;
  if (allowedEmails) {
    // Fetch the user's primary email from Clerk and compare
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const primaryEmail =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ?? "";

      const allowed = allowedEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(primaryEmail.toLowerCase());

      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } catch {
      res.status(500).json({ error: "Could not verify admin identity" });
      return;
    }
  }

  next();
}
