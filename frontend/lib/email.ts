/**
 * PROPRIETARY — Always Improving LLC
 * Email Service - SendGrid Integration
 */

import sgMail from "@sendgrid/mail";
import { logger } from "./logger";

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@monthavengroup.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "MAE Platform";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    content: string; // Base64 encoded
    filename: string;
    type: string;
    disposition?: "attachment" | "inline";
  }>;
  categories?: string[];
  sendAt?: number; // Unix timestamp for scheduled sending
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const log = logger.child({ fn: "sendEmail" });

  if (!process.env.SENDGRID_API_KEY) {
    log.warn("SendGrid not configured");
    return { success: false, error: "Email not configured" };
  }

  try {
    const msg: any = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      replyTo: options.replyTo,
      categories: options.categories,
      sendAt: options.sendAt,
    };

    // Use template or content
    if (options.templateId) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData;
    } else {
      msg.text = options.text || " ";  // At least one content type required
      msg.html = options.html;
    }

    // Add attachments
    if (options.attachments?.length) {
      msg.attachments = options.attachments;
    }

    const [response] = await sgMail.send(msg);

    log.info("Email sent", { 
      to: options.to, 
      subject: options.subject,
      messageId: response.headers["x-message-id"],
    });

    return { 
      success: true, 
      messageId: response.headers["x-message-id"] as string,
    };
  } catch (error: any) {
    log.error("Email send failed", { 
      error: error.message,
      to: options.to,
    });

    return { 
      success: false, 
      error: error.response?.body?.errors?.[0]?.message || error.message,
    };
  }
}

/**
 * Send notification email to user
 */
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; 
                  border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MAE Platform</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="margin-top: 0; color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          ${actionUrl ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${actionUrl}" 
                 style="display: inline-block; padding: 12px 30px; 
                        background: #6366f1; color: white; text-decoration: none;
                        border-radius: 8px; font-weight: 500;">
                ${actionText || "View Details"}
              </a>
            </div>
          ` : ""}
        </div>
        <div style="padding: 20px; background: #f9f9f9; text-align: center; 
                    color: #999; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Always Improving LLC</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: title,
    html,
    text: `${title}\n\n${message}${actionUrl ? `\n\nView: ${actionUrl}` : ""}`,
    categories: ["notification"],
  });
}

/**
 * Send lead assignment email
 */
export async function sendLeadAssignmentEmail(
  to: string,
  agentName: string,
  leadName: string,
  leadPhone: string,
  leadAddress?: string
): Promise<EmailResult> {
  return sendNotificationEmail(
    to,
    "New Lead Assigned",
    `A new lead has been assigned to you:\n\n` +
    `Name: ${leadName}\n` +
    `Phone: ${leadPhone}\n` +
    `${leadAddress ? `Address: ${leadAddress}\n` : ""}` +
    `\nPlease follow up promptly.`,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/contacts`,
    "View Lead"
  );
}

/**
 * Send voicemail notification email
 */
export async function sendVoicemailEmail(
  to: string,
  callerName: string,
  callerPhone: string,
  duration: number,
  transcription?: string
): Promise<EmailResult> {
  return sendNotificationEmail(
    to,
    "New Voicemail",
    `You have a new voicemail:\n\n` +
    `From: ${callerName || callerPhone}\n` +
    `Duration: ${Math.round(duration / 60)} min ${duration % 60} sec\n` +
    `${transcription ? `\nTranscription:\n"${transcription}"` : ""}`,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/voicemail`,
    "Listen Now"
  );
}

/**
 * Send daily summary email
 */
export async function sendDailySummaryEmail(
  to: string,
  stats: {
    callsMade: number;
    callsReceived: number;
    messagesSent: number;
    leadsConverted: number;
    totalTalkTime: number;
  }
): Promise<EmailResult> {
  const talkTimeHours = Math.floor(stats.totalTalkTime / 3600);
  const talkTimeMinutes = Math.floor((stats.totalTalkTime % 3600) / 60);

  return sendNotificationEmail(
    to,
    "Your Daily Activity Summary",
    `Here's your activity summary for today:\n\n` +
    `📞 Outbound Calls: ${stats.callsMade}\n` +
    `📱 Inbound Calls: ${stats.callsReceived}\n` +
    `💬 Messages Sent: ${stats.messagesSent}\n` +
    `🎯 Leads Converted: ${stats.leadsConverted}\n` +
    `⏱️ Talk Time: ${talkTimeHours}h ${talkTimeMinutes}m\n\n` +
    `Keep up the great work!`,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    "View Dashboard"
  );
}

const emailService = {
  sendEmail,
  sendNotificationEmail,
  sendLeadAssignmentEmail,
  sendVoicemailEmail,
  sendDailySummaryEmail,
};

export default emailService;
