import { shouldRespectQuietHours } from "./normalize.js";

function renderTemplate(template, lead) {
  return template
    .replace(/\$\{FirstName\}/g, lead.FirstName ?? "")
    .replace(/\$\{LastName\}/g, lead.LastName ?? "")
    .replace(/\$\{StreetAddress\}/g, lead.StreetAddress ?? "");
}

function resolveBatchSize() {
  const value = Number.parseInt(process.env.BATCH_SIZE ?? "150", 10);
  if (Number.isNaN(value) || value <= 0) {
    return 150;
  }
  return value;
}

function chunkArray(input, size) {
  const chunks = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

function withinQuietHours() {
  if (!shouldRespectQuietHours()) {
    return false;
  }
  return true;
}

export async function sendBatch({ leads, template, dryRun, batchName }) {
  const result = { sent: [], preview: [] };
  if (!leads.length) {
    return result;
  }

  if (!dryRun && withinQuietHours()) {
    console.log("Quiet hours in effect – skipping send batch");
    return result;
  }

  const baseUrl = process.env.EZTEXTING_API_BASE;
  const apiKey = process.env.EZTEXTING_API_KEY;

  if (!dryRun) {
    if (!baseUrl) throw new Error("EZTEXTING_API_BASE env var required when sending texts");
    if (!apiKey) throw new Error("EZTEXTING_API_KEY env var required when sending texts");
  }

  const batchSize = resolveBatchSize();
  const chunks = chunkArray(leads, batchSize);
  const pacingMs = Number.parseInt(process.env.SEND_PACING_MS ?? "120", 10);

  for (const chunk of chunks) {
    for (const lead of chunk) {
      const message = renderTemplate(template, lead);
      if (dryRun) {
        result.preview.push({ phone: lead.phone, message });
        continue;
      }

      const response = await fetch(`${baseUrl}/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: lead.phone,
          message,
          metadata: {
            campaign: batchName,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.text();
        console.error(`Failed to send message to ${lead.phone}: ${response.status} ${payload}`);
        result.sent.push({
          phone: lead.phone,
          message,
          status: "ERROR",
          providerId: null,
        });
        continue;
      }

      const json = await response.json();
      result.sent.push({
        phone: lead.phone,
        message,
        status: "SENT",
        providerId: json?.id ?? null,
      });

      if (pacingMs > 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, pacingMs));
      }
    }
  }

  return result;
}

export async function pollStatuses({ sent }) {
  if (!sent?.length) return [];
  const baseUrl = process.env.EZTEXTING_API_BASE;
  const apiKey = process.env.EZTEXTING_API_KEY;
  if (!baseUrl || !apiKey) return [];

  const updates = [];
  for (const record of sent) {
    if (!record.providerId) continue;
    const response = await fetch(`${baseUrl}/messages/${record.providerId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const payload = await response.text();
      console.error(`Failed to fetch delivery status for ${record.providerId}: ${response.status} ${payload}`);
      continue;
    }

    const json = await response.json();
    updates.push({
      phone: record.phone,
      providerId: record.providerId,
      delivery: json?.status ?? "Unknown",
    });
  }

  return updates;
}
