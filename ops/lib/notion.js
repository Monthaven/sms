const BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

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

export async function upsertBatch({ name, count, status }) {
  const databaseId = process.env.NOTION_DB_BATCHES;
  if (!databaseId) {
    return { id: null, name };
  }

  const response = await fetch(`${BASE_URL}/pages`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Count: { number: count },
        Status: status ? { select: { name: status } } : undefined,
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Failed to create Notion batch: ${response.status} ${errorPayload}`);
  }

  const json = await response.json();
  return { id: json.id, name };
}

export async function upsertLeads(leads, batch) {
  if (!leads.length) return;
  const databaseId = process.env.NOTION_DB_LEADS;
  if (!databaseId) {
    throw new Error("NOTION_DB_LEADS env var is required to upsert leads");
  }

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

    const response = await fetch(`${BASE_URL}/pages`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`Failed to upsert Notion lead ${lead.phone}: ${response.status} ${errorPayload}`);
    }
  }
}

export async function markDelivery(updates) {
  if (!updates?.length) return;
  const databaseId = process.env.NOTION_DB_LEADS;
  if (!databaseId) return;

  const statusMap = new Map();
  for (const update of updates) {
    statusMap.set(update.phone, update.delivery ?? "Unknown");
  }

  for (const [phone, status] of statusMap.entries()) {
    // In a production build we would search for the page by phone
    // and patch the Status property. Placeholder for now.
    console.warn(`markDelivery not implemented: phone=${phone} status=${status}`);
  }
}
