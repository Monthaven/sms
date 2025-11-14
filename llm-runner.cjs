/*
 llm-runner.cjs

 - Reads `address-lookup-prompts.json` (generated earlier)
 - Sends prompts to an OpenAI-compatible ChatCompletions endpoint (uses OPENAI_API_KEY)
 - Parses LLM JSON output and writes `address-lookup-results-llm.json` and CSV
 - Safe defaults: processes only a sample (default 50). Use SAMPLE_SIZE env var to change.

 USAGE (PowerShell):
 $env:OPENAI_API_KEY = 'sk-...'
 node llm-runner.cjs

 To run a small sample (20):
 $env:SAMPLE_SIZE = '20'
 node llm-runner.cjs

 SECURITY: Do not paste API keys in chat. Set them in your shell before asking me to run the script.
*/

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const PROMPTS_JSON = path.join(__dirname, 'address-lookup-prompts.json');
const OUT_JSON = path.join(__dirname, 'address-lookup-results-llm.json');
const OUT_CSV = path.join(__dirname, 'address-lookup-results-llm.csv');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || '50', 10);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // you can change model via env

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY env var not set. Set it in your shell before running.');
  process.exit(1);
}

async function loadPrompts() {
  try {
    const raw = await fs.readFile(PROMPTS_JSON, 'utf8');
    const arr = JSON.parse(raw);
    return arr;
  } catch (err) {
    console.error('Could not read prompts JSON:', PROMPTS_JSON, err.message);
    return [];
  }
}

function makeMessages(promptText) {
  return [
    { role: 'system', content: 'You are a JSON-output assistant that finds property addresses and classifies property type (COMMERCIAL or SFH). Respond with STRICT valid JSON only.' },
    { role: 'user', content: promptText }
  ];
}

async function callOpenAI(promptText) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: MODEL,
    messages: makeMessages(promptText),
    temperature: 0.0,
    max_tokens: 500
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return content || '';
}

function safeParseJSON(s) {
  // Try to extract first JSON block
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // fallback: attempt non-strict fixes
    try {
      const cleaned = candidate.replace(/\b([A-Za-z0-9_]+):/g, '"$1":');
      return JSON.parse(cleaned);
    } catch (e2) {
      return null;
    }
  }
}

function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function main() {
  const prompts = await loadPrompts();
  if (!prompts || prompts.length === 0) {
    console.error('No prompts found. Generate address-lookup-prompts.json first.');
    return;
  }

  const toProcess = prompts.slice(0, SAMPLE_SIZE);
  console.log(`Processing ${toProcess.length} prompts with model ${MODEL} (sample size=${SAMPLE_SIZE})`);

  const results = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    console.log(`(${i+1}/${toProcess.length}) Calling LLM for phone: ${p.phone} name: ${p.name}`);
    try {
      const raw = await callOpenAI(p.prompt);
      const parsed = safeParseJSON(raw);
      if (!parsed) {
        results.push({ index: p.index, phone: p.phone, name: p.name, raw, parsed: null, error: 'Invalid JSON' });
      } else {
        results.push({ index: p.index, phone: p.phone, name: p.name, parsed, raw });
      }
      // small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 350));
    } catch (err) {
      console.error('Error calling OpenAI for', p.phone, err.message);
      results.push({ index: p.index, phone: p.phone, name: p.name, error: err.message });
      // continue with next
      await new Promise(r => setTimeout(r, 500));
    }
  }

  await fs.writeFile(OUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log('Wrote', OUT_JSON);

  const header = 'Phone,Full_Name,Final_Classification,Confidence,Top_Address,Notes';
  const csvLines = [header];
  for (const r of results) {
    if (r.parsed) {
      const top = (r.parsed.address_candidates && r.parsed.address_candidates[0]) ? r.parsed.address_candidates[0].address : '';
      csvLines.push([esc(r.phone), esc(r.name), esc(r.parsed.final_classification), esc(r.parsed.confidence_score), esc(top), esc(r.parsed.notes)].join(','));
    } else {
      csvLines.push([esc(r.phone), esc(r.name), 'ERROR', '', '', esc(r.error || r.raw || '')].join(','));
    }
  }

  await fs.writeFile(OUT_CSV, csvLines.join('\n'), 'utf8');
  console.log('Wrote', OUT_CSV);
  console.log('Done. Review the LLm outputs and mark low-confidence results for manual review.');
}

main().catch(err => { console.error(err); process.exit(1); });
