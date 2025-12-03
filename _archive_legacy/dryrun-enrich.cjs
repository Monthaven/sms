/*
 dryrun-enrich.cjs
 - Reads address-lookup-prompts.json
 - Filters HOT and WARM responseType prompts
 - Runs enriched heuristics: keyword extraction, inferred property type, suggested action, confidence
 - Writes address-lookup-results-dryrun-enriched.json and .csv
 Usage: node dryrun-enrich.cjs
*/

const fs = require('fs').promises;
const path = require('path');
const PROMPTS = path.join(__dirname, 'address-lookup-prompts.json');
const OUT_JSON = path.join(__dirname, 'address-lookup-results-dryrun-enriched.json');
const OUT_CSV = path.join(__dirname, 'address-lookup-results-dryrun-enriched.csv');

function keywordsFromMessage(msg) {
  if (!msg) return [];
  const words = msg.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['the','and','or','to','for','of','in','on','a','an','is','are','you','we','i']);
  const freq = {};
  words.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w]||0)+1; });
  const arr = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);
  return arr.slice(0,6);
}

function inferPropertyType(msg, keywords, instructions) {
  const m = (msg||'').toLowerCase();
  const indicatorsCommercial = ['shopping','center','mall','retail','office','industrial','warehouse','tenant','cap','cap rate','development','apartment','multi','duplex','triplex','fourplex','loi','offer','joint venture','jv','shopping centers','shopping center'];
  const indicatorsSFH = ['house','home','single','single-family','sfh','residential','acre','lot','backyard','garage'];
  const comm = indicatorsCommercial.some(i=>m.includes(i) || keywords.includes(i));
  const sfh = indicatorsSFH.some(i=>m.includes(i) || keywords.includes(i));
  if (comm && !sfh) return {type:'COMMERCIAL',confidence:90,reason:'Commercial keywords present'};
  if (sfh && !comm) return {type:'SFH',confidence:90,reason:'Residential keywords present'};
  // look at instructions
  if (instructions && /commercial/i.test(instructions)) return {type:'COMMERCIAL',confidence:75,reason:'Instruction indicates commercial focus'};
  // fallback to language signals
  if (/how much|make (me )?an? offer|interested|shopping|tenant|cap rate|development|center|mall|retail/.test(m)) return {type:'COMMERCIAL',confidence:70,reason:'Selling language suggests commercial or high-value asset'};
  if (/maybe|possibly|not interested|no thanks|nope|later|thinking/.test(m)) return {type:'SFH',confidence:55,reason:'Neutral language, default to SFH with low confidence'};
  return {type:'UNKNOWN',confidence:40,reason:'No clear indicators'};
}

function suggestedAction(responseType, inferred) {
  if (responseType === 'HOT') return 'Call immediately; prioritize for offer; run address lookup now';
  if (responseType === 'WARM') return 'Follow-up via text/call; run address lookup and research';
  if (responseType === 'COLD') return 'Add to nurturing campaign; optional lookup';
  if (responseType === 'OPT_OUT') return 'Respect opt-out; remove from lists';
  return 'Review manually';
}

async function main(){
  try{
    const raw = await fs.readFile(PROMPTS,'utf8');
    const arr = JSON.parse(raw);
    const filtered = arr.filter(p => (p.responseType||'').toUpperCase() === 'HOT' || (p.responseType||'').toUpperCase() === 'WARM');
    const results = filtered.map(p=>{
      const kw = keywordsFromMessage(p.message);
      const inferred = inferPropertyType(p.message, kw, p.instructions);
      const action = suggestedAction((p.responseType||'').toUpperCase(), inferred);
      const notes = `Dry-run enriched: keywords=${kw.join('|')} reason=${inferred.reason}`;
      return {
        index: p.index,
        phone: p.phone,
        name: p.name,
        responseType: p.responseType,
        priority: p.priority,
        message: p.message,
        keywords: kw,
        inferred_property_type: inferred.type,
        inferred_confidence: inferred.confidence,
        suggested_action: action,
        notes
      };
    });

    await fs.writeFile(OUT_JSON, JSON.stringify(results,null,2),'utf8');

    const header = ['Index','Phone','Name','ResponseType','Priority','Message','Keywords','InferredType','Confidence','SuggestedAction','Notes'].join(',');
    const lines = [header];
    for (const r of results){
      const esc = v => {
        if (v===null||v===undefined) return '';
        const s = String(v).replace(/\r?\n/g,' ');
        if (s.includes(',')||s.includes('"')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"';
        return s;
      };
      lines.push([r.index,esc(r.phone),esc(r.name),esc(r.responseType),esc(r.priority),esc(r.message.slice(0,200)),esc(r.keywords.join('|')),esc(r.inferred_property_type),esc(r.inferred_confidence),esc(r.suggested_action),esc(r.notes)].join(','));
    }
    await fs.writeFile(OUT_CSV, lines.join('\n'),'utf8');
    console.log('Wrote enriched dry-run JSON and CSV for', results.length, 'HOT/WARM leads');
  }catch(err){
    console.error('Error',err);
  }
}

main();
