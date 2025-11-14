// providers/google-geocode.cjs
// Google Maps Platform integration (Places / Geocoding)
// Exports: async geocodePrompt(prompt) -> { address_candidates, final_classification, confidence_score, notes }

const fetch = require('node-fetch');

const API_KEY = process.env.GOOGLE_API_KEY;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeQueryFromPrompt(p) {
  // Build a best-effort text query from available fields
  const parts = [];
  if (p.name) parts.push(p.name);
  if (p.message) parts.push(p.message.replace(/\n/g, ' '));
  if (p.instructions) parts.push(p.instructions);
  // Keep query concise
  return parts.join(' | ').slice(0, 300);
}

async function findPlace(query) {
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,formatted_address,name,types&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FindPlace API ${res.status}`);
  return res.json();
}

async function placeDetails(place_id) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,types,geometry,formatted_phone_number&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PlaceDetails API ${res.status}`);
  return res.json();
}

async function geocodeAddressString(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode API ${res.status}`);
  return res.json();
}

function classifyFromTypes(types = [], message = '') {
  const t = (types || []).join('|').toLowerCase();
  const m = (message || '').toLowerCase();
  const commercialHints = ['shopping', 'mall', 'retail', 'store', 'office', 'industrial', 'warehouse', 'establishment', 'point_of_interest', 'premise', 'bus_station', 'transit_station'];
  const sfhHints = ['street_address', 'premise', 'home', 'house', 'residence', 'residential'];

  if (commercialHints.some(h => t.includes(h) || m.includes(h))) return 'COMMERCIAL';
  if (sfhHints.some(h => t.includes(h) || m.includes(h))) return 'SFH';
  return 'UNKNOWN';
}

module.exports = {
  async geocodePrompt(p) {
    if (!API_KEY) throw new Error('Missing GOOGLE_API_KEY env var');

    const query = makeQueryFromPrompt(p);
    const candidates = [];
    let final_classification = 'UNKNOWN';
    let confidence_score = 0;
    let notes = '';

    try {
      // 1) Try Find Place
      const findRes = await findPlace(query);
      await sleep(120); // polite pause

      if (findRes && findRes.candidates && findRes.candidates.length > 0) {
        // For each candidate, try to get details
        for (const c of findRes.candidates.slice(0, 3)) {
          try {
            const pid = c.place_id || c.placeId || null;
            if (pid) {
              const details = await placeDetails(pid);
              if (details && details.result) {
                const address = details.result.formatted_address || c.formatted_address || details.result.name || '';
                const types = details.result.types || c.types || [];
                const reason = `Found via Places (types: ${types.join(',')})`;
                const conf = types.length ? 85 : 65;
                candidates.push({ address, confidence: conf, reason });
                // pick best classification
                final_classification = classifyFromTypes(types, p.message) || final_classification;
                confidence_score = Math.max(confidence_score, conf);
              }
            }
          } catch (err) {
            // ignore per-candidate errors
            notes += `placeDetails error: ${err.message}; `;
          }
        }
      }

      // 2) If no candidates yet, try geocoding the query directly
      if (candidates.length === 0) {
        const geo = await geocodeAddressString(query);
        if (geo && geo.results && geo.results.length > 0) {
          for (const g of geo.results.slice(0, 3)) {
            const addr = g.formatted_address || '';
            const conf = g.partial_match ? 50 : 80;
            candidates.push({ address: addr, confidence: conf, reason: 'Geocoding result' });
            if (conf > confidence_score) confidence_score = conf;
          }
          // classification guess from address text
          final_classification = classifyFromTypes([], p.message);
        } else {
          notes += 'No geocode results; ';
        }
      }

      if (candidates.length === 0) {
        candidates.push({ address: 'No match found', confidence: 10, reason: 'No candidates from Places or Geocoding' });
        confidence_score = Math.max(confidence_score, 10);
        final_classification = final_classification || 'UNKNOWN';
      }

      // If classification still UNKNOWN, derive from message keywords
      if (final_classification === 'UNKNOWN') {
        final_classification = classifyFromTypes([], p.message);
        if (final_classification === 'UNKNOWN') confidence_score = Math.max(confidence_score, 40);
      }

    } catch (err) {
      notes += `Exception: ${err.message}`;
      candidates.push({ address: 'Provider error', confidence: 0, reason: err.message });
      final_classification = 'UNKNOWN';
      confidence_score = 0;
    }

    return {
      phone: p.phone,
      name: p.name,
      index: p.index,
      address_candidates: candidates,
      final_classification,
      confidence_score,
      notes: notes || 'OK - results from Google Maps'
    };
  }
};