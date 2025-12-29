/**
 * PROPRIETARY — Always Improving LLC
 * SendGrid Webhook Handler - Email Events
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger, generateRequestId } from "@/lib/logger";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SendGrid event types
type SendGridEventType = 
  | "processed" 
  | "dropped" 
  | "delivered" 
  | "deferred" 
  | "bounce" 
  | "open" 
  | "click" 
  | "spam_report" 
  | "unsubscribe";

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: SendGridEventType;
  sg_message_id?: string;
  reason?: string;
  bounce_classification?: string;
  url?: string;
  useragent?: string;
}

/**
 * POST - Handle SendGrid webhook events
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/webhooks/sendgrid", requestId });

  // Verify webhook signature if configured
  const signature = req.headers.get("X-Twilio-Email-Event-Webhook-Signature");
  const timestamp = req.headers.get("X-Twilio-Email-Event-Webhook-Timestamp");
  
  const rawBody = await req.text();

  if (process.env.SENDGRID_WEBHOOK_KEY && signature && timestamp) {
    const payload = timestamp + rawBody;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SENDGRID_WEBHOOK_KEY)
      .update(payload)
      .digest("base64");

    if (signature !== expectedSignature) {
      log.warn("Invalid SendGrid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const events: SendGridEvent[] = JSON.parse(rawBody);

    log.info(`Processing ${events.length} email events`);

    for (const event of events) {
      await processEvent(event, log);
    }

    return NextResponse.json({ received: events.length });
  } catch (error: any) {
    log.error("SendGrid webhook error", { error: error.message });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processEvent(event: SendGridEvent, log: any) {
  const { email, event: eventType, reason, bounce_classification } = event;

  switch (eventType) {
    case "bounce":
      // Mark contact email as bounced
      await prisma.contact.updateMany({
        where: { email },
        data: { 
          emailBounced: true,
          emailConsent: false,
        },
      });
      log.info("Email bounced", { email, reason, bounce_classification });
      break;

    case "spam_report":
      // Opt out from email
      await prisma.contact.updateMany({
        where: { email },
        data: { 
          emailConsent: false,
          doNotContactReason: "Spam report",
        },
      });
      log.info("Spam report received", { email });
      break;

    case "unsubscribe":
      // Update consent
      await prisma.contact.updateMany({
        where: { email },
        data: { emailConsent: false },
      });
      log.info("Email unsubscribe", { email });
      break;

    case "delivered":
      log.debug("Email delivered", { email });
      break;

    case "open":
      // Could track engagement
      log.debug("Email opened", { email });
      break;

    case "click":
      // Track link clicks
      log.debug("Email link clicked", { email, url: event.url });
      break;

    case "dropped":
      log.warn("Email dropped", { email, reason });
      break;

    default:
      log.debug("Unhandled email event", { eventType, email });
  }
}
