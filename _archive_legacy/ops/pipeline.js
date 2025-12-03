#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "./lib/csv.js";
import { normalizeLeads } from "./lib/normalize.js";
import { upsertLeads, upsertBatch, markDelivery } from "./lib/notion.js";
import { sendBatch, pollStatuses } from "./lib/eztexting.js";
import { createLogSheet, appendLogRows } from "./lib/sheets.js";
import { emitReportArtifact } from "./lib/logging.js";
import { 
  detectPropertyType, 
  calculateCommercialMetrics, 
  generateCommercialTemplates,
  scoreCommercialLead,
  generateCapitalStackOffer,
  detectMotivatedSeller
} from "./lib/commercial.js";

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

  // Enhance leads with commercial real estate intelligence
  const enhancedLeads = leads.map(lead => {
    const propertyType = detectPropertyType({
      description: lead.PropertyType || lead.propertyType || '',
      propertyType: lead.PropertyType || lead.propertyType || '',
      zoning: lead.Zoning || lead.zoning || '',
      usage: lead.Usage || lead.usage || ''
    });

    const commercialMetrics = calculateCommercialMetrics({
      askingPrice: parseFloat(lead.AskingPrice || lead.askingPrice || 0),
      annualRent: parseFloat(lead.AnnualRent || lead.annualRent || 0),
      expenses: parseFloat(lead.Expenses || lead.expenses || 0),
      squareFootage: parseFloat(lead.SquareFootage || lead.squareFootage || 0),
      occupancyRate: parseFloat(lead.OccupancyRate || lead.occupancyRate || 0.95),
      marketCapRate: parseFloat(process.env.MARKET_CAP_RATE || 0.06)
    });

    const leadData = {
      ownershipType: lead.OwnershipType || lead.ownershipType || 'unknown',
      yearsOwned: parseInt(lead.YearsOwned || lead.yearsOwned || 0),
      outOfStateOwner: (lead.OutOfState || lead.outOfState || '').toLowerCase() === 'true',
      elderlyOwner: (lead.ElderlyOwner || lead.elderlyOwner || '').toLowerCase() === 'true',
      partnershipDispute: (lead.PartnershipDispute || lead.partnershipDispute || '').toLowerCase() === 'true',
      distressSignals: {
        delinquentTaxes: (lead.DelinquentTaxes || lead.delinquentTaxes || '').toLowerCase() === 'true',
        vacancyIssues: (lead.VacancyIssues || lead.vacancyIssues || '').toLowerCase() === 'true',
        deferredMaintenance: (lead.DeferredMaintenance || lead.deferredMaintenance || '').toLowerCase() === 'true',
        loanMaturity: (lead.LoanMaturity || lead.loanMaturity || '').toLowerCase() === 'true'
      }
    };

    const marketData = { 
      daysOnMarket: 45, 
      priceAppreciation: 0.12,
      marketCapRate: parseFloat(process.env.MARKET_CAP_RATE || 0.065),
      interestRateEnvironment: process.env.RATE_ENVIRONMENT || 'stable'
    };

    const leadScore = scoreCommercialLead(leadData, { 
      ...propertyType, 
      estimatedValue: commercialMetrics.estimatedValue,
      capRate: commercialMetrics.capRate,
      occupancyRate: parseFloat(lead.OccupancyRate || lead.occupancyRate || 0.95)
    }, marketData);

    // Generate capital stack offer for this property
    const capitalStackOffer = generateCapitalStackOffer({
      ...commercialMetrics,
      estimatedValue: commercialMetrics.estimatedValue,
      distressIndicators: Object.values(leadData.distressSignals).filter(Boolean)
    }, marketData, {
      targetCapRate: parseFloat(process.env.TARGET_CAP_RATE || 0.075),
      renovationBudget: parseFloat(lead.RenovationBudget || lead.renovationBudget || 0),
      discountForDistress: parseFloat(process.env.DISTRESS_DISCOUNT || 0.10)
    });

    // Detect motivation level for targeted approach
    const motivationAnalysis = detectMotivatedSeller(leadData, {
      ...propertyType,
      vacancyRate: 1 - parseFloat(lead.OccupancyRate || lead.occupancyRate || 0.95),
      deferredMaintenance: leadData.distressSignals.deferredMaintenance
    }, marketData);

    return {
      ...lead,
      propertyType: propertyType.type,
      propertyTypeConfidence: propertyType.confidence,
      commercialMetrics,
      leadScore,
      capitalStackOffer,
      motivationAnalysis,
      buyerPriority: leadScore >= 80 ? 'IMMEDIATE' : leadScore >= 60 ? 'HIGH' : 'MEDIUM',
      enhanced: true
    };
  });

  const batchName = path.basename(csvPath);
  const batch = await upsertBatch({
    name: batchName,
    count: enhancedLeads.length,
    status: "Queued",
    propertyTypes: [...new Set(enhancedLeads.map(l => l.propertyType))].join(', '),
    avgLeadScore: enhancedLeads.reduce((sum, l) => sum + l.leadScore, 0) / enhancedLeads.length
  });

  await upsertLeads(enhancedLeads, batch);

  let sheet = null;
  if (process.env.GOOGLE_SA_JSON && process.env.GSHEETS_PARENT_FOLDER_ID) {
    sheet = await createLogSheet({
      batchName,
      parentFolderId: process.env.GSHEETS_PARENT_FOLDER_ID,
    });
    await appendLogRows(sheet, [["timestamp", "phone", "message", "status", "providerId"]]);
  }

  const baseTemplate = process.env.MESSAGE_TEMPLATE ?? "Hi ${FirstName}";
  
  // Use SINGLE HUMAN TEMPLATE for everything (your proven approach)
  const templatedLeads = enhancedLeads.map(lead => {
    // Your proven template - no robotic variations
    const callerName = process.env.CALLER_NAME || 'John';
    const callerNumber = process.env.CALLER_NUMBER || '555-123-4567';
    
    // Single template for ALL properties - keeps it human and consistent
    const selectedTemplate = `Hi, reaching out about your property at ${lead.StreetAddress}. Still open to offers, or has that ship sailed? ${callerName} Monthaven Capital ${callerNumber}`;
    
    // Check message length (160 char limit)
    const messageLength = selectedTemplate.length;
    const withinLimit = messageLength <= 160;
    
    return {
      ...lead,
      customTemplate: selectedTemplate,
      messageLength,
      withinLimit,
      // Simple priority for callers
      callPriority: lead.leadScore >= 80 ? 'HOT' : lead.leadScore >= 60 ? 'WARM' : 'COLD'
    };
  });

  const { sent, preview } = await sendBatch({
    leads: templatedLeads,
    template: baseTemplate, // This will be overridden by individual templates
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
