import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const fromNumber = process.env.TWILIO_MAIN_FROM || "";
const enabled = (process.env.TWILIO_ENABLED || "false").toLowerCase() === "true";

const client = enabled && accountSid && authToken ? twilio(accountSid, authToken) : null;

type TemplateData = {
  firstName?: string;
  lastName?: string;
  propertyAddress?: string;
  propertyName?: string;
  agentName?: string;
};

function fillTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const k = key as keyof TemplateData;
    return data[k] ?? "";
  });
}

export async function sendSMS(to: string, bodyTemplate: string, data: TemplateData = {}) {
  if (!enabled) throw new Error("Twilio disabled (TWILIO_ENABLED != true)");
  if (!client) throw new Error("Twilio client not configured");
  if (!fromNumber) throw new Error("TWILIO_MAIN_FROM not set");

  const body = fillTemplate(bodyTemplate, data);

  const res = await client.messages.create({
    to,
    from: fromNumber,
    body,
  });

  return { sid: res.sid, body };
}

export { fillTemplate };
