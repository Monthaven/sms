// move-gold-to-exchange.ts
import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Get these from your Notion URLs - the 32-char ID after the workspace name

const AI_SCRAPE_DB = "9af74f9f-5983-4190-b8b0-e6a0ce0d3dd3";
const EXCHANGE_LOG_DB = "43f31db6-8869-4511-81a0-23ecd4181e95";

const DOMAIN_MAP: Record<string, string> = {
  // SONA / Training
  "sona": "SONA", "partner": "SONA", "training": "SONA", "fine-tun": "SONA",
  "exchange log": "SONA", "extraction": "SONA", "chatml": "SONA", "lora": "SONA",
  
  // Portal / Frontend
  "portal": "Portal", "frontend": "Portal", "dashboard": "Portal", "vercel": "Portal",
  "next.js": "Portal", "nextjs": "Portal", "react": "Portal", "component": "Portal",
  "admin": "Portal", "ui": "Portal", "page.tsx": "Portal",
  
  // CRE / Real Estate
  "cre": "CRE", "insurance": "CRE", "property": "CRE", "dscr": "CRE",
  "multifamily": "CRE", "apartment": "CRE", "rent": "CRE", "lease": "CRE",
  "underwriting": "CRE", "cap rate": "CRE", "noi": "CRE",
  
  // OM
  "om ": "OM", "offering memorandum": "OM", "interactive om": "OM",
  
  // System
  "api": "System", "database": "System", "schema": "System", "prisma": "System",
  "neon": "System", "sync": "System", "webhook": "System",
};

function inferDomain(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, domain] of Object.entries(DOMAIN_MAP)) {
    if (lower.includes(keyword)) return domain;
  }
  return "System";
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

async function main() {
  let hasMore = true;
  let cursor: string | undefined;
  let moved = 0;
  let errors = 0;

  console.log("Starting Gold → Exchange Log migration...\n");

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: AI_SCRAPE_DB,
      filter: {
        and: [
          { property: "Quality", select: { equals: "Gold" } },
          { property: "Processed", checkbox: { equals: false } },
        ],
      },
      start_cursor: cursor,
      page_size: 100,
    });

    console.log(`Fetched batch of ${response.results.length} entries...`);

    for (const page of response.results) {
      const props = (page as any).properties;

      // Extract values safely
      const scrapeId = props["Scrape ID"]?.title?.[0]?.plain_text || `SCRAPE-${Date.now()}`;
      const userMsg = props["User Message"]?.rich_text?.[0]?.plain_text || "";
      const aiResp = props["AI Response"]?.rich_text?.[0]?.plain_text || "";
      const convId = props["Conversation ID"]?.rich_text?.[0]?.plain_text || "";
      const capturedAt = props["Captured At"]?.date?.start || new Date().toISOString();

      const exchangeId = scrapeId.replace("SCRAPE-", "EXCH-");
      const domain = inferDomain(userMsg + " " + aiResp);

      // Check if response needs overflow to page content
      const needsOverflow = aiResp.length > 2000;

      try {
        // Create Exchange Log entry
        const newPage = await notion.pages.create({
          parent: { database_id: EXCHANGE_LOG_DB },
          properties: {
            "Exchange ID": { title: [{ text: { content: exchangeId } }] },
            "User Message": { rich_text: [{ text: { content: truncate(userMsg, 2000) } }] },
            "Sona Response": { rich_text: [{ text: { content: truncate(aiResp, 2000) } }] },
            "Session ID": { rich_text: [{ text: { content: convId } }] },
            "Quality": { select: { name: "Approved" } },
            "Tags": { multi_select: [{ name: "#Gold" }, { name: "#Training" }] },
            "Training Ready": { checkbox: true },
            "Domain": { select: { name: domain } },
            "Timestamp": { date: { start: capturedAt } },
          },
          // If overflow, add full response as page content
          ...(needsOverflow && {
            children: [
              {
                object: "block" as const,
                type: "callout" as const,
                callout: {
                  icon: { emoji: "📝" as const },
                  rich_text: [{ type: "text" as const, text: { content: "Full response (overflow)" } }],
                },
              },
              {
                object: "block" as const,
                type: "code" as const,
                code: {
                  language: "plain text",
                  rich_text: [{ type: "text" as const, text: { content: aiResp } }],
                },
              },
            ],
          }),
        });

        // Mark original as processed
        await notion.pages.update({
          page_id: page.id,
          properties: {
            "Processed": { checkbox: true },
          },
        });

        moved++;
        const overflow = needsOverflow ? " [+overflow]" : "";
        console.log(`✓ ${exchangeId} → ${domain}${overflow}`);
      } catch (err: any) {
        errors++;
        console.error(`✗ ${scrapeId}: ${err.message || err}`);
      }

      await sleep(350); // ~3 req/sec to stay under Notion limits
    }

    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Migration complete.`);
  console.log(`  Moved:  ${moved}`);
  console.log(`  Errors: ${errors}`);
  console.log(`${"=".repeat(50)}`);
}

main().catch(console.error);