const BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

const dataSourceCache = new Map();

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

function notionHeaders() {
  const token = assertEnv("NOTION_TOKEN");
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...notionHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Notion request failed ${response.status} ${response.statusText}: ${errorPayload}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function resolveDataSourceId(databaseId) {
  if (!databaseId) return null;
  if (dataSourceCache.has(databaseId)) {
    return dataSourceCache.get(databaseId);
  }

  const json = await notionFetch(`/databases/${databaseId}`);
  const dataSources = json?.data_sources ?? [];
  const dataSourceId = dataSources[0]?.id;
  if (!dataSourceId) {
    throw new Error(`Notion database ${databaseId} does not expose a data_source_id`);
  }

  dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

async function queryDataSource(databaseId, body) {
  const dataSourceId = await resolveDataSourceId(databaseId);
  if (!dataSourceId) {
    throw new Error(`Unable to resolve data source for database ${databaseId}`);
  }

  return notionFetch(`/data_sources/${dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export async function upsertBatch({ name, count, status }) {
  const databaseId = process.env.NOTION_DB_BATCHES;
  if (!databaseId) {
    return { id: null, name };
  }

  const dataSourceId = await resolveDataSourceId(databaseId);

  const json = await notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Count: { number: count },
        Status: status ? { select: { name: status } } : undefined,
      },
    }),
  });

  return { id: json?.id ?? null, name };
}

export async function upsertLeads(leads, batch) {
  if (!leads.length) return;
  const databaseId = process.env.NOTION_DB_LEADS;
  if (!databaseId) {
    throw new Error("NOTION_DB_LEADS env var is required to upsert leads");
  }

  const dataSourceId = await resolveDataSourceId(databaseId);

  for (const lead of leads) {
    const properties = {
      Name: {
        title: [
          {
            text: {
              content: `${lead.FirstName} ${lead.LastName}`.trim() || lead.phone,
            },
          },
        ],
      },
      Phone: { phone_number: lead.phone },
      Address: {
        rich_text: [
          {
            text: {
              content: [lead.StreetAddress, lead.City, lead.State, lead.Zip]
                .filter(Boolean)
                .join(", "),
            },
          },
        ],
      },
      Status: { select: { name: "Queued" } },
    };

    if (batch?.id) {
      properties.Batch = { relation: [{ id: batch.id }] };
    }

    await notionFetch(`/pages`, {
      method: "POST",
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        properties,
      }),
    });
  }
}

export async function markDelivery(updates) {
  if (!updates?.length) return;
  const databaseId = process.env.NOTION_DB_LEADS;
  if (!databaseId) return;

  const normalizePhone = (value) => (value ?? "").replace(/\D+/g, "");

  const notionStatusByDelivery = new Map([
    ["delivered", "Delivered"],
    ["bounced", "Bounced"],
    ["opted_out", "Opted Out"],
    ["no_credits", "Failed"],
    ["failed", "Failed"],
    ["sent", "Sent"],
    ["queued", "Sent"],
  ]);

  const merged = new Map();
  for (const update of updates) {
    if (!update?.phone) continue;
    const phoneKey = normalizePhone(update.phone);
    if (!phoneKey) continue;
    merged.set(phoneKey, {
      rawPhone: update.phone,
      delivery: (update.delivery ?? "sent").toString().toLowerCase(),
      deliveredAt: update.deliveredAt ?? null,
    });
  }

  for (const [, payload] of merged) {
    const { rawPhone, delivery, deliveredAt } = payload;
    const filter = {
      property: "Phone",
      phone_number: { equals: rawPhone },
    };

    let queryResponse = await queryDataSource(databaseId, { filter });

    if (!queryResponse?.results?.length && rawPhone.startsWith("+")) {
      const altFilter = {
        property: "Phone",
        phone_number: { equals: rawPhone.replace(/\D+/g, "") },
      };
      queryResponse = await queryDataSource(databaseId, { filter: altFilter });
    }

    const page = queryResponse?.results?.[0];
    if (!page?.id) continue;

    const notionStatus = notionStatusByDelivery.get(delivery) ?? "Sent";
    const properties = {};

    if (page.properties?.Status) {
      properties.Status = { select: { name: notionStatus } };
    }

    if (delivery === "delivered" && deliveredAt && page.properties?.["Last Delivery At"]) {
      properties["Last Delivery At"] = { date: { start: deliveredAt } };
    }

    if (Object.keys(properties).length === 0) {
      continue;
    }

    await notionFetch(`/pages/${page.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  }
}
