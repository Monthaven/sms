/*
  address-verifier.cjs

  - Reads August-5th-ADDRESS-VERIFICATION-PRIORITY-2025-11-12.csv
  - Produces:
    - address-lookup-prompts.json  (array of detailed AI prompts)
    - address-lookup-tasks.csv      (CSV with Phone_Number,Full_Name,Message,Response_Type,Priority_Score,AI_Prompt)

  Usage: node address-verifier.cjs
  This is a dry-run helper: it does NOT call external APIs. It formats and exports lookup prompts for your AI/address service.
*/

const fs = require('fs').promises;
const path = require('path');

const INPUT_CSV = path.join(__dirname, 'August-5th-ADDRESS-VERIFICATION-PRIORITY-2025-11-12.csv');
const OUT_JSON = path.join(__dirname, 'address-lookup-prompts.json');
const OUT_CSV = path.join(__dirname, 'address-lookup-tasks.csv');

async function readCSV(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] === undefined ? '' : values[j];
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function buildPrompt(row) {
  // Row headers: Full_Name,Phone_Number,Message,Response_Type,Priority_Score,AI_Lookup_Instructions
  const name = row['Full_Name'] || 'Unknown';
  const phone = row['Phone_Number'] || '';
  const message = row['Message'] || '';
  const responseType = row['Response_Type'] || '';
  const priority = row['Priority_Score'] || '';
  const instructions = row['AI_Lookup_Instructions'] || '';

  // Craft a concise but specific LLM prompt for address lookup + property type
  const prompt = `You are a property data assistant. Given a contact and their SMS response, find the most likely property address and whether the property is COMMERCIAL or SFH (single-family). If multiple properties match, list top 3 with justification and confidence percentage. Use public property indicators (business names, property class, square footage hints, mention of tenants, shopping centers, etc.). Do not invent property ownership. Output JSON with keys: address_candidates (array of {address,confidence,reason}), final_classification (COMMERCIAL|SFH|UNKNOWN), confidence_score (0-100), notes.\n\nContact details:\n- Name: ${name}\n- Phone: ${phone}\n- Message: ${message}\n- Response Type: ${responseType}\n- Priority Score: ${priority}\n\nLookup instructions: ${instructions}\n\nReturn only valid JSON. If no likely address found, return final_classification=UNKNOWN and an explanation in notes.`;

  return prompt;
}

function escapeCSVCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  console.log('Reading priority CSV:', INPUT_CSV);
  const rows = await readCSV(INPUT_CSV);
  console.log('Rows to process:', rows.length);

  const prompts = [];
  const csvLines = [
    'Phone_Number,Full_Name,Message,Response_Type,Priority_Score,AI_Prompt'
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prompt = buildPrompt(r);
    prompts.push({
      index: i+1,
      phone: r['Phone_Number'] || '',
      name: r['Full_Name'] || '',
      message: r['Message'] || '',
      responseType: r['Response_Type'] || '',
      priority: r['Priority_Score'] || '',
      instructions: r['AI_Lookup_Instructions'] || '',
      prompt
    });

    csvLines.push([
      escapeCSVCell(r['Phone_Number'] || ''),
      escapeCSVCell(r['Full_Name'] || ''),
      escapeCSVCell((r['Message'] || '').slice(0,200)),
      escapeCSVCell(r['Response_Type'] || ''),
      escapeCSVCell(r['Priority_Score'] || ''),
      escapeCSVCell(prompt.replace(/\n/g, ' '))
    ].join(','));
  }

  await fs.writeFile(OUT_JSON, JSON.stringify(prompts, null, 2), 'utf8');
  console.log('Wrote', OUT_JSON);
  await fs.writeFile(OUT_CSV, csvLines.join('\n'), 'utf8');
  console.log('Wrote', OUT_CSV);
  console.log('Done. Next: send the CSV or JSON to your AI/address provider or run automated provider calls.');
}

main().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});