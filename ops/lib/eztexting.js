import { shouldRespectQuietHours } from "./normalize.js";

const API_BASE = "https://app.eztexting.com";

function renderTemplate(template, lead) {
  // Use custom template if available, otherwise use provided template
  const templateToUse = lead.customTemplate || template;
  
  return templateToUse
    .replace(/\$\{FirstName\}/g, lead.FirstName ?? "")
    .replace(/\$\{LastName\}/g, lead.LastName ?? "")
    .replace(/\$\{StreetAddress\}/g, lead.StreetAddress ?? "")
    .replace(/\$\{PropertyType\}/g, lead.propertyType ?? "")
    .replace(/\$\{SquareFootage\}/g, lead.SquareFootage || lead.squareFootage || "")
    .replace(/\$\{EstimatedValue\}/g, lead.commercialMetrics?.estimatedValue ? 
      `$${(lead.commercialMetrics.estimatedValue / 1000000).toFixed(1)}M` : "")
    .replace(/\$\{CapRate\}/g, lead.commercialMetrics?.capRate ? 
      `${lead.commercialMetrics.capRate.toFixed(1)}%` : "")
    .replace(/\$\{CapitalOffer\}/g, lead.capitalStackOffer?.recommendedOffer ?
      `$${(lead.capitalStackOffer.recommendedOffer / 1000000).toFixed(1)}M` : "")
    .replace(/\$\{OfferRange\}/g, lead.capitalStackOffer?.offerRange ?
      `$${(lead.capitalStackOffer.offerRange.low / 1000000).toFixed(1)}M-${(lead.capitalStackOffer.offerRange.high / 1000000).toFixed(1)}M` : "")
    .replace(/\$\{DebtToValue\}/g, lead.capitalStackOffer?.capitalStack?.debtToValue ?
      `${lead.capitalStackOffer.capitalStack.debtToValue}%` : "")
    .replace(/\$\{MotivationLevel\}/g, lead.motivationAnalysis?.motivationLevel ?? "");
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

function sanitizePhone(value) {
  return (value ?? "").replace(/\D+/g, "");
}

function resolveCredentials() {
  const user = process.env.EZTEXTING_USER ?? process.env.EZ_USER;
  const password = process.env.EZTEXTING_PASSWORD ?? process.env.EZ_PASSWORD ?? process.env.EZ_PASS;

  if (!user || !password) {
    throw new Error("EZTEXTING_USER and EZTEXTING_PASSWORD env vars are required when sending texts");
  }

  return { user, password };
}

function buildFormPayload(payload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        params.append(`${key}[]`, entry);
      });
      return;
    }
    params.append(key, value);
  });
  return params.toString();
}

function detectOptOut(entry, phone) {
  const normalized = sanitizePhone(phone);
  const localOptOuts = entry?.LocalOptOuts ?? [];
  const globalOptOuts = entry?.GlobalOptOuts ?? [];
  const combined = [...localOptOuts, ...globalOptOuts];
  return combined.some((value) => {
    if (!value) return false;
    if (typeof value === "object") {
      const candidate = value.PhoneNumber ?? value.phoneNumber ?? value.Phone ?? value.msisdn ?? value.number ?? value.contactPhone;
      return sanitizePhone(candidate) === normalized;
    }
    return sanitizePhone(value) === normalized;
  });
}

async function sendMessage({ user, password }, { phone, message }) {
  const url = new URL(`${API_BASE}/sending/messages`);
  url.searchParams.set("format", "json");

  const payload = buildFormPayload({
    User: user,
    Password: password,
    PhoneNumbers: [phone],
    Message: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`EZ Texting send failed ${response.status} ${errorPayload}`);
  }

  const json = await response.json();
  const entry = json?.Response?.Entry ?? {};
  const status = json?.Response?.Status;

  if (status !== "Success") {
    const code = json?.Response?.Code ?? "unknown";
    throw new Error(`EZ Texting send failed with status ${status} (code ${code})`);
  }

  const providerId = entry?.ID ?? null;
  const recipientsCount = entry?.RecipientsCount ?? entry?.Recipients ?? 0;
  const optedOut = detectOptOut(entry, phone);

  return {
    providerId,
    recipientsCount: Number.parseInt(recipientsCount, 10) || 0,
    optedOut,
  };
}

async function fetchStatusDetail({ user, password, providerId, phone }) {
  const normalizedPhone = sanitizePhone(phone);
  const statuses = [
    { key: "opted_out", param: "opted_out" },
    { key: "bounced", param: "bounced" },
    { key: "no_credits", param: "no_credits" },
    { key: "delivered", param: "delivered" },
  ];

  for (const status of statuses) {
    const url = new URL(`${API_BASE}/sending/reports/${providerId}/view-details/`);
    url.searchParams.set("format", "json");
    url.searchParams.set("status", status.param);
    url.searchParams.set("User", user);
    url.searchParams.set("Password", password);

    let response;
    try {
      // eslint-disable-next-line no-await-in-loop
      response = await fetch(url);
    } catch (error) {
      console.error(`Failed to fetch EZ Texting delivery detail (${status.param}) for ${providerId}:`, error);
      continue;
    }

    if (!response.ok) {
      continue;
    }

    let json;
    try {
      json = await response.json();
    } catch (error) {
      console.error(`Failed to parse EZ Texting detail response (${status.param}) for ${providerId}:`, error);
      continue;
    }

    const entry = json?.Response?.Entry ?? {};
    const candidates = [];
    const pushCandidate = (value) => {
      if (!value) return;
      if (typeof value === "string") {
        candidates.push({ phone: value });
        return;
      }
      if (typeof value === "object") {
        candidates.push({
          phone: value.PhoneNumber ?? value.phoneNumber ?? value.Phone ?? value.msisdn ?? value.number ?? value.contactPhone ?? null,
          deliveredAt: value.DeliveryDate ?? value.DeliveredAt ?? value.deliveryDate ?? value.date ?? null,
        });
      }
    };

    const arrays = [
      entry?.PhoneNumbers,
      entry?.Recipients,
      entry?.Results,
      entry?.Items,
    ];

    arrays.forEach((arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(pushCandidate);
    });

    if (candidates.length === 0 && typeof entry?.PhoneNumber === "string") {
      candidates.push({ phone: entry.PhoneNumber });
    }

    const match = candidates.find((candidate) => sanitizePhone(candidate.phone) === normalizedPhone);
    if (match) {
      return { status: status.key, deliveredAt: match.deliveredAt ?? null };
    }
  }

  return { status: "sent", deliveredAt: null };
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

  const credentials = !dryRun ? resolveCredentials() : null;

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

      try {
        // eslint-disable-next-line no-await-in-loop
        const sendResult = await sendMessage(credentials, {
          phone: lead.phone,
          message,
        });

        const status = sendResult.optedOut
          ? "OPTED_OUT"
          : sendResult.recipientsCount > 0
            ? "SENT"
            : "FAILED";

        result.sent.push({
          phone: lead.phone,
          message,
          status,
          providerId: sendResult.providerId,
        });
      } catch (error) {
        console.error(`Failed to send message to ${lead.phone}:`, error);
        result.sent.push({
          phone: lead.phone,
          message,
          status: "ERROR",
          providerId: null,
        });
      }

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
  const credentials = resolveCredentials();

  const updates = [];
  for (const record of sent) {
    if (!record.providerId) continue;

    if (record.status === "OPTED_OUT") {
      updates.push({
        phone: record.phone,
        providerId: record.providerId,
        delivery: "opted_out",
      });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const detail = await fetchStatusDetail({
      user: credentials.user,
      password: credentials.password,
      providerId: record.providerId,
      phone: record.phone,
    });

    updates.push({
      phone: record.phone,
      providerId: record.providerId,
      delivery: detail.status,
      deliveredAt: detail.deliveredAt ?? null,
    });
  }

  return updates;
}
