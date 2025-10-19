#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "./lib/csv.js";
import { normalizeLeads } from "./lib/normalize.js";
import { upsertLeads, upsertBatch, markDelivery } from "./lib/notion.js";
import { sendBatch, pollStatuses } from "./lib/eztexting.js";
import { createLogSheet, appendLogRows } from "./lib/sheets.js";
import { emitReportArtifact } from "./lib/logging.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const csvPath = args.csv || process.env.CSV_PATH;
  const dryRun = ((args["dry-run"] ?? process.env.DRY_RUN ?? "true") === "true");

  if (!csvPath) {
    throw new Error("CSV path required. Pass --csv or set CSV_PATH env var.");
  }

  const absolutePath = path.isAbsolute(csvPath)
    ? csvPath
    : path.join(process.cwd(), csvPath);

  const csvExists = fs.existsSync(absolutePath);
  if (!csvExists) {
    throw new Error(`CSV path not found: ${absolutePath}`);
  }

  const csvContents = fs.readFileSync(absolutePath, "utf8");

  const leadsRaw = await parseCsv(csvContents);
  const leads = normalizeLeads(leadsRaw);

  const batchName = path.basename(csvPath);
  const batch = await upsertBatch({
    name: batchName,
    count: leads.length,
    status: "Queued",
  });

  await upsertLeads(leads, batch);

  let sheet = null;
  if (process.env.GOOGLE_SA_JSON && process.env.GSHEETS_PARENT_FOLDER_ID) {
    sheet = await createLogSheet({
      batchName,
      parentFolderId: process.env.GSHEETS_PARENT_FOLDER_ID,
    });
    await appendLogRows(sheet, [["timestamp", "phone", "message", "status", "providerId"]]);
  }

  const template = process.env.MESSAGE_TEMPLATE ?? "Hi ${FirstName}";
  const { sent, preview } = await sendBatch({
    leads,
    template,
    dryRun,
    batchName,
  });

  if (sheet && sent.length > 0) {
    const rows = sent.map((entry) => [
      new Date().toISOString(),
      entry.phone,
      entry.message,
      entry.status,
      entry.providerId ?? "",
    ]);
    await appendLogRows(sheet, rows);
  }

  if (dryRun && preview.length > 0) {
    await emitReportArtifact({
      batchName,
      preview,
    });
  }

  if (!dryRun) {
    const updates = await pollStatuses({ sent });
    if (sheet && updates.length > 0) {
      const rows = updates.map((update) => [
        new Date().toISOString(),
        update.phone,
        "",
        update.delivery,
        update.providerId ?? "",
      ]);
      await appendLogRows(sheet, rows);
    }
    await markDelivery(updates);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
