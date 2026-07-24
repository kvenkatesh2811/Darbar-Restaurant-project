import { db, leadsTable, loyaltyRewardsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

// Direct fetch implementation for Resend REST API
async function sendBirthdayEmail(to: string, name: string, htmlContent: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    logger.warn("Resend email service is not configured for birthday reminders.");
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Darbar Restaurant <${fromEmail}>`,
        to: [to],
        subject: "Happy Birthday from Darbar Multi-Cuisine Restaurant! 🎉",
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API returned status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    logger.info({ to }, "Birthday reminder email sent successfully");
  } catch (error) {
    logger.error({ error, to }, "Error sending birthday email");
  }
}

export async function checkAndSendBirthdayReminders() {
  logger.info("Checking for upcoming birthdays tomorrow...");

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth(); // 0-11
    const tomorrowDay = tomorrow.getDate(); // 1-31

    const leads = await db.select().from(leadsTable);

    const tomorrowLeads = leads.filter((lead) => {
      if (!lead.dateOfBirth) return false;
      
      // Parse YYYY-MM-DD
      const parts = lead.dateOfBirth.split("-");
      if (parts.length < 3) return false;
      
      const dobMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      const dobDay = parseInt(parts[2], 10);
      
      return dobDay === tomorrowDay && dobMonth === tomorrowMonth;
    });

    logger.info({ count: tomorrowLeads.length }, "Found leads with birthdays tomorrow");

    const currentYear = new Date().getFullYear();

    for (const lead of tomorrowLeads) {
      if (!lead.email) continue;

      const [alreadySent] = await db
        .select()
        .from(loyaltyRewardsTable)
        .where(
          and(
            eq(loyaltyRewardsTable.customerId, lead.email),
            eq(loyaltyRewardsTable.rewardType, "birthday_email"),
            sql`EXTRACT(YEAR FROM ${loyaltyRewardsTable.createdAt}) = ${currentYear}`
          )
        );

      if (alreadySent) {
        logger.info({ email: lead.email }, "Birthday email already sent for this year. Skipping.");
        continue;
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Happy Birthday from Darbar!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; color: #1c1917;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background-color: #f97316; padding: 40px 30px; text-align: center;">
              <span style="font-size: 50px;">🎂</span>
              <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 28px; font-family: Georgia, serif;">Happy Birthday!</h1>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1c1917;">Hi ${lead.name},</p>
              <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #44403c;">
                Happy Birthday from Darbar Multi-Cuisine Restaurant! We hope your special day is filled with joy, laughter, and delicious food.
              </p>
              <div style="background-color: #fff7ed; border: 1px dashed #fdba74; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #c2410c; font-weight: 700;">Exclusive Birthday Offer</p>
                <p style="margin: 0; font-size: 24px; font-weight: 800; color: #f97316;">Enjoy 10% Off</p>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #7c2d12;">Just place an order using your registered details on your birthday and your discount will be automatically applied at checkout!</p>
              </div>
              <p style="margin: 0; font-size: 12px; color: #78716c;">
                Darbar Multi-Cuisine Restaurant<br/>
                support@darbar-restaurant.com | +91 98450 11223
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendBirthdayEmail(lead.email, lead.name, emailHtml);

      await db
        .insert(loyaltyRewardsTable)
        .values({
          customerId: lead.email,
          rewardType: "birthday_email",
          rewardStatus: "sent",
        });
    }
  } catch (error) {
    logger.error({ error }, "Error running birthday reminder service check");
  }
}

export function startBirthdayReminderSchedule() {
  setTimeout(() => {
    checkAndSendBirthdayReminders().catch((err) => {
      logger.error({ err }, "Initial birthday check failed");
    });
  }, 10000);

  setInterval(() => {
    checkAndSendBirthdayReminders().catch((err) => {
      logger.error({ err }, "Scheduled birthday check failed");
    });
  }, 24 * 60 * 60 * 1000);
}
