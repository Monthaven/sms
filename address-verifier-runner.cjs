/**
 * address-verifier-runner.cjs
 *
 * Reads `address-lookup-prompts.json` and runs provider/LLM lookups.
 * This runner supports DRY_RUN mode (default) and real provider modes.
 *
 * Modes (via env):
 *  - DRY_RUN=true  -> produce sample results without external calls (default)
 *  - PROVIDER=google|smarty|llm -> attempt provider execution (requires API keys in env)
 *
 * Outputs:
 *  - address-lookup-results-dryrun.json  (or -results.json)
 *  - address-lookup-results.csv
 */

const fs = require('fs').promises;
const path = require('path');

const PROMPTS_JSON = path.join(__dirname, 'address-lookup-prompts.json');
const OUT_JSON = path.join(__dirname, 'address-lookup-results-dryrun.json');
const OUT_CSV = path.join(__dirname, 'address-lookup-results.csv');

async function loadPrompts() {
  try {
    const raw = await fs.readFile(PROMPTS_JSON, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Could not read prompts JSON:', PROMPTS_JSON, err.message);
    return [];
  }
}

function sampleResolvePrompt(p) {
  // Lightweight heuristic-based sample result for dry-run
  const message = (p.message || '').toLowerCase();
  let final_classification = 'UNKNOWN';
  let confidence = 40;
  const candidates = [];

  // Detect address-like strings (e.g., '123 Main St' or zip codes)
  const addressLike = /\b\d{1,5}\s+[^,\n]{2,40}\s+(st|street|rd|road|ave|avenue|blvd|lane|ln|dr|drive|court|ct|place|pl|way)\b/i.test(p.message || '') || /\b\d{5}\b/.test(p.message || '');

  const commercialRe = /\b(shopping|center|mall|store|retail|office|industrial|warehouse|tenant|cap rate|JV|development|shopping centers|shopping center|commercial)\b/;
  const residentialRe = /\b(house|single family|sfh|home|residential|living in|my house|my home|acre|lot|vacant)\b/;
  const sellingRe = /\b(how much|make (me )?an? offer|offer|interested|call me|asap|urgent|ready to sell|selling|price)\b/;

  if (addressLike) {
    // If user included an address or zip, prefer higher confidence
    if (commercialRe.test(message)) {
      final_classification = 'COMMERCIAL';
      confidence = 90;
      candidates.push({ address: 'Address text found in message (commercial)', confidence: 90, reason: 'Address-like text + commercial keywords' });
    } else if (residentialRe.test(message)) {
      final_classification = 'SFH';
      confidence = 90;
      candidates.push({ address: 'Address text found in message (residential)', confidence: 90, reason: 'Address-like text + residential keywords' });
    } else {
      // Address present but unclear type
      final_classification = 'UNKNOWN';
      confidence = 75;
      candidates.push({ address: 'Address-like text found in message (needs parsing)', confidence: 75, reason: 'Address-like text without clear type keywords' });
    }
  } else if (commercialRe.test(message)) {
    final_classification = 'COMMERCIAL';
    confidence = 85;
    candidates.push({ address: 'Unknown commercial property (needs lookup)', confidence: 85, reason: 'Message mentions commercial indicators' });
  } else if (residentialRe.test(message)) {
    final_classification = 'SFH';
    confidence = 85;
    candidates.push({ address: 'Unknown residential property (needs lookup)', confidence: 85, reason: 'Message contains single-family indicators' });
  } else if (sellingRe.test(message)) {
    final_classification = 'COMMERCIAL';
    confidence = 70;
    candidates.push({ address: 'Potential commercial or high-value property (uncertain)', confidence: 70, reason: 'Strong selling language' });
  } else {
    candidates.push({ address: 'No likely match (manual review)', confidence: 20, reason: 'No clear indicators' });
  }

  return {
    phone: p.phone,
    name: p.name,
    index: p.index,
    final_classification,
    confidence_score: confidence,
    address_candidates: candidates,
    notes: 'DRY_RUN sample result - replace with provider output for production'
  };
}

function toCsvLine(r) {
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const topAddr = (r.address_candidates && r.address_candidates[0]) ? r.address_candidates[0].address : '';
  return [r.phone, r.name, r.final_classification, r.confidence_score, topAddr, r.notes].map(esc).join(',');
}

async function main() {
  const prompts = await loadPrompts();
  if (!prompts || prompts.length === 0) {
    console.log('No prompts to process. Ensure address-lookup-prompts.json exists in the folder.');
    return;
  }

  const dryRun = process.env.DRY_RUN !== 'false';
  if (process.env.PROVIDER) console.log('Requested provider mode:', process.env.PROVIDER);
  console.log(`DRY_RUN=${dryRun} | Prompts to process: ${prompts.length}`);

  // Support batch processing via env vars so user can run in sets (e.g., 50 rows):
  // SAMPLE_SIZE -> number of rows to process in this run
  // START_INDEX  -> zero-based index to start from (default 0)
  const batchSize = parseInt(process.env.SAMPLE_SIZE || process.env.BATCH_SIZE || '0', 10) || 0;
  const startIndex = parseInt(process.env.START_INDEX || process.env.OFFSET || '0', 10) || 0;
  let processPrompts = prompts;
  let batchLabel = '';
  if (batchSize > 0) {
    const endIndex = Math.min(startIndex + batchSize, prompts.length);
    processPrompts = prompts.slice(startIndex, endIndex);
    batchLabel = `-batch-${startIndex}-${endIndex - 1}`;
    console.log(`Batch mode enabled. Processing prompts[${startIndex}..${endIndex - 1}] (${processPrompts.length} rows)`);
  }

  const results = [];

  // If real provider mode requested, attempt to load and use it
  const providerName = (process.env.PROVIDER || '').toLowerCase();
  let provider = null;
  let outJson = OUT_JSON;
  let outCsv = OUT_CSV;

  if (!dryRun && providerName) {
    try {
      if (providerName === 'google') {
        provider = require('./providers/google-geocode.cjs');
        outJson = path.join(__dirname, 'address-lookup-results-google.json');
        outCsv = path.join(__dirname, 'address-lookup-results-google.csv');
        console.log('Using Google provider for lookups');
      } else if (providerName === 'smarty') {
        provider = require('./providers/smarty.cjs');
        outJson = path.join(__dirname, 'address-lookup-results-smarty.json');
        outCsv = path.join(__dirname, 'address-lookup-results-smarty.csv');
        console.log('Using Smarty provider for lookups');
      } else {
        console.log('Unknown provider requested:', providerName, 'falling back to dry-run sample');
      }
    } catch (err) {
      console.error('Could not load provider module:', err.message);
      provider = null;
    }
  }

  for (const p of processPrompts) {
    if (dryRun || !provider) {
      results.push(sampleResolvePrompt(p));
    } else {
      try {
        // provider.geocodePrompt should return structured result
        const res = await provider.geocodePrompt(p);
        results.push(res);
      } catch (err) {
        console.error('Provider error for', p.phone, err.message);
        // fallback to sample for this row
        results.push(Object.assign(sampleResolvePrompt(p), { notes: `Provider error: ${err.message}` }));
      }
      // polite pause to respect rate limits
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // If batchLabel is present, add it to the output filenames so runs don't overwrite each other
  if (batchLabel) {
    const dirname = path.dirname(outJson);
    const baseJson = path.basename(outJson, path.extname(outJson));
    const baseCsv = path.basename(outCsv, path.extname(outCsv));
    outJson = path.join(dirname, `${baseJson}${batchLabel}.json`);
    outCsv = path.join(dirname, `${baseCsv}${batchLabel}.csv`);
  }

  await fs.writeFile(outJson, JSON.stringify(results, null, 2), 'utf8');
  console.log('Wrote results JSON:', outJson);

  const header = 'Phone,Full_Name,Final_Classification,Confidence,Top_Address,Notes';
  const csv = [header, ...results.map(toCsvLine)].join('\n');
  await fs.writeFile(outCsv, csv, 'utf8');
  console.log('Wrote results CSV:', outCsv);

  if (dryRun || !provider) {
    console.log('Dry-run complete. To enable real providers, set PROVIDER and DRY_RUN=false and add API keys (see README).');
  } else {
    console.log('Provider run complete. Review results and the retry queue for low-confidence rows.');
  }
}

main().catch(err => {
  console.error('Runner error', err);
  process.exit(1);
});