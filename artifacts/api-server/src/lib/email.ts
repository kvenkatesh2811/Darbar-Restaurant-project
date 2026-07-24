import { logger } from "./logger";

// Direct fetch implementation for Resend REST API
// Avoids requiring npm package installation which fails due to runner path issues.
async function sendEmailViaResend(to: string, subject: string, htmlContent: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    logger.warn("Resend email service is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
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
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API returned status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    logger.info({ to, subject }, "Email sent successfully via Resend API");
  } catch (error) {
    logger.error({ error, to, subject }, "Error occurred while sending email via Resend");
  }
}

// Map database status string to friendly label
function getStatusLabel(status: string): string {
  const mapping: Record<string, string> = {
    pending: "Order Received",
    confirmed: "Restaurant Accepted",
    preparing: "Preparing Food",
    ready: "Food Ready / Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    completed: "Delivered / Picked Up",
    cancelled: "Cancelled",
  };
  return mapping[status] || status;
}

// Get Site Tracking Link dynamically from request
function getTrackingLink(req: any, orderId: number): string {
  const protocol = req.protocol;
  const host = req.get("host");
  const basePath = process.env.BASE_PATH || "";
  const pathSuffix = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${protocol}://${host}${pathSuffix}order/track/${orderId}`;
}

export async function sendOrderConfirmationEmail(order: any, req: any) {
  if (!order.email) {
    logger.warn({ orderId: order.id }, "No email registered for order. Skipping confirmation email.");
    return;
  }

  const subtotal = order.items.reduce(
    (sum: number, item: any) => sum + Number(item.price) * item.quantity,
    0
  );
  const gst = subtotal * 0.05;
  const deliveryCharge = Number(order.deliveryCharge);
  const grandTotal = Number(order.totalAmount);
  const trackingUrl = getTrackingLink(req, order.id);

  const itemsListHtml = order.items
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4;">
          <strong>${item.menuItemName}</strong> × ${item.quantity}
        </td>
        <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #e7e5e4;">
          ₹${(Number(item.price) * item.quantity).toFixed(0)}
        </td>
      </tr>`
    )
    .join("");

  const addressHtml =
    order.orderType === "delivery" && order.deliveryAddress
      ? `<div style="margin-top: 20px; padding: 15px; background-color: #f5f5f4; border-radius: 8px;">
          <h4 style="margin: 0 0 5px 0; color: #1c1917; font-size: 14px;">Delivery Address:</h4>
          <p style="margin: 0; font-size: 13px; color: #57534e;">
            ${order.deliveryAddress.houseNumber}, ${order.deliveryAddress.street},<br/>
            ${order.deliveryAddress.area}, ${order.deliveryAddress.city} - ${order.deliveryAddress.pincode}
            ${order.deliveryAddress.landmark ? `<br/><i>Landmark: ${order.deliveryAddress.landmark}</i>` : ""}
          </p>
         </div>`
      : "";

  const timeHtml =
    order.orderType === "pickup"
      ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #57534e;"><strong>Pickup Slot:</strong> ${order.pickupTime}</p>`
      : "";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - Darbar</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; color: #1c1917;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        
        <!-- Header Banner -->
        <div style="background-color: #f97316; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-family: Georgia, serif;">Darbar Restaurant</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Order Confirmation</p>
        </div>

        <!-- Main Body -->
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${order.customerName},</p>
          <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.5; color: #44403c;">
            Thank you for choosing Darbar! We have received your order and the kitchen is ready. Here are your order details:
          </p>

          <!-- Order Summary Details Info -->
          <div style="border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Order ID:</td>
                <td style="font-weight: 600; text-align: right; padding: 4px 0;">#${order.id}</td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Order Date:</td>
                <td style="text-align: right; padding: 4px 0;">${new Date(order.createdAt).toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Order Type:</td>
                <td style="text-align: right; padding: 4px 0; text-transform: capitalize;">${order.orderType}</td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Payment Method:</td>
                <td style="text-align: right; padding: 4px 0;">${order.paymentMethod}</td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Payment Status:</td>
                <td style="text-align: right; padding: 4px 0; font-weight: 600; color: #f97316;">Pending (Paid at ${order.orderType === "delivery" ? "delivery" : "pickup"})</td>
              </tr>
            </table>
            ${addressHtml}
            ${timeHtml}
          </div>

          <!-- Items Table -->
          <h3 style="margin: 0 0 10px 0; font-size: 15px; border-bottom: 2px solid #e7e5e4; padding-bottom: 8px;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
            ${itemsListHtml}
          </table>

          <!-- Financial summary -->
          <div style="width: 100%; max-width: 300px; margin-left: auto; margin-bottom: 30px; font-size: 14px;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Subtotal</td>
                <td style="text-align: right; padding: 4px 0;">₹${subtotal.toFixed(0)}</td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">GST (5%)</td>
                <td style="text-align: right; padding: 4px 0;">₹${gst.toFixed(0)}</td>
              </tr>
              ${
                order.orderType === "delivery"
                  ? `<tr>
                      <td style="color: #78716c; padding: 4px 0;">Delivery Charge</td>
                      <td style="text-align: right; padding: 4px 0;">${deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge.toFixed(0)}`}</td>
                     </tr>`
                  : ""
              }
              <tr>
                <td style="font-weight: bold; padding: 8px 0 0 0; border-top: 1px solid #e7e5e4; font-size: 16px;">Grand Total</td>
                <td style="font-weight: bold; text-align: right; padding: 8px 0 0 0; color: #f97316; font-size: 18px;">₹${grandTotal.toFixed(0)}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${trackingUrl}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: 600; border-radius: 8px; font-size: 15px; display: inline-block;">
              Track Order Status
            </a>
          </div>

          <p style="margin: 0; font-size: 13px; color: #78716c; text-align: center; line-height: 1.5;">
            Questions? Contact us at support@darbar-restaurant.com or call +91 98450 11223.<br/>
            Darbar Multi-Cuisine Restaurant
          </p>

        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailViaResend(
    order.email,
    "Order Confirmation - Darbar Multi-Cuisine Restaurant",
    emailHtml
  );
}

export async function sendOrderStatusUpdateEmail(
  order: any,
  oldStatus: string | null,
  newStatus: string,
  req: any
) {
  if (!order.email) {
    logger.warn({ orderId: order.id }, "No email registered for status update. Skipping email notification.");
    return;
  }

  const grandTotal = Number(order.totalAmount);
  const trackingUrl = getTrackingLink(req, order.id);

  const prevStatusLabel = oldStatus ? getStatusLabel(oldStatus) : "Unknown";
  const newStatusLabel = getStatusLabel(newStatus);

  // Delivery partner specifics if available
  let deliveryPartnerHtml = "";
  if (
    order.orderType === "delivery" &&
    newStatus === "out_for_delivery" &&
    order.deliveryPartner
  ) {
    deliveryPartnerHtml = `
      <div style="margin-top: 25px; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
        <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 15px; display: flex; align-items: center; gap: 8px;">
          🚴 Delivery Partner Details:
        </h4>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; color: #14532d;">
          <tr>
            <td style="padding: 3px 0; width: 110px; font-weight: 600;">Name:</td>
            <td style="padding: 3px 0;">${order.deliveryPartner.name}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; font-weight: 600;">Phone:</td>
            <td style="padding: 3px 0;">${order.deliveryPartner.phone}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; font-weight: 600;">Vehicle Number:</td>
            <td style="padding: 3px 0;">${order.deliveryPartner.vehicleNumber}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update - Darbar</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; color: #1c1917;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        
        <!-- Header Banner -->
        <div style="background-color: #f97316; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-family: Georgia, serif;">Darbar Restaurant</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Status Update</p>
        </div>

        <!-- Main Body -->
        <div style="padding: 30px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${order.customerName},</p>
          <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.5; color: #44403c;">
            We wanted to let you know that the status of your order <strong>#${order.id}</strong> has been updated.
          </p>

          <!-- Status Box -->
          <div style="border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; background-color: #fdf8f6; border-left: 5px solid #f97316; margin-bottom: 25px;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              ${oldStatus ? `
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Previous Status:</td>
                <td style="text-decoration: line-through; text-align: right; padding: 4px 0;">${prevStatusLabel}</td>
              </tr>` : ""}
              <tr>
                <td style="color: #78716c; padding: 4px 0; font-weight: 500;">Current Status:</td>
                <td style="font-weight: bold; text-align: right; padding: 4px 0; color: #f97316; font-size: 16px; text-transform: uppercase;">
                  ${newStatusLabel}
                </td>
              </tr>
              <tr>
                <td style="color: #78716c; padding: 4px 0;">Order Total:</td>
                <td style="font-weight: 600; text-align: right; padding: 4px 0;">₹${grandTotal.toFixed(0)}</td>
              </tr>
            </table>
          </div>

          ${deliveryPartnerHtml}

          <!-- Action Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${trackingUrl}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: 600; border-radius: 8px; font-size: 15px; display: inline-block;">
              Track Order Status
            </a>
          </div>

          <p style="margin: 0; font-size: 13px; color: #78716c; text-align: center; line-height: 1.5;">
            Questions? Contact us at support@darbar-restaurant.com or call +91 98450 11223.<br/>
            Darbar Multi-Cuisine Restaurant
          </p>

        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailViaResend(
    order.email,
    `Your Order Status Has Been Updated - Darbar Multi-Cuisine Restaurant`,
    emailHtml
  );
}
