/*
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Copyright (c) 2025 Always Improving LLC.
 * No license is granted. Access per Shareholders' Agreement §8.3.
 */

# DealMachine Pull Integration Plan (Draft)

Goal: fetch DealMachine data directly (no manual CSV) and feed the existing ingest pipeline so downstream scoring/queueing stays unchanged.

## Proposed flow
1) **Client**: new `src/services/dealMachineClient.ts` wrapping DealMachine API. Auth via API key/token env vars.
2) **Pull script**: `src/scripts/pull-dealmachine.ts` that:
   - Accepts `--campaign <id>` and optional `--since <ISO>` / `--limit <n>`.
   - Pages through DealMachine contacts/properties.
   - Writes a temp CSV (same columns as current ingest) or streams rows directly into `ImportService.processDealMachineCsv`.
3) **Mapping**: normalize to existing ingest schema (Property, Contact, Lead). Ensure phone normalization (E.164), dedupe, and type flags (mobile/landline).
4) **Telemetry**: log to `IngestionJob` with source=`dealmachine-api` and counts (fetched, deduped, created, skipped).

## Data mapping (expected)
- Property: address, city, state, postalCode, latitude/longitude (if provided), parcelId (if provided).
- Contact: firstName, lastName, ownerName, phone numbers (tagged mobile/landline/other), email (optional).
- Lead: campaignId (arg), source="DEALMACHINE", status NEW (mobile) or QUEUED_FOR_CALL (landline).
- Flags: ownerMatch, vacancy, tags/labels -> map to `Contact.flag*` fields where possible.

## API considerations
- Add env vars: `DEALMACHINE_API_BASE` (default prod), `DEALMACHINE_API_KEY` (required), `DEALMACHINE_PAGE_SIZE` (optional).
- Rate limits: implement backoff (HTTP 429). Default page size 100, pause 300–500ms between pages.
- Idempotency: use DealMachine contact/property IDs as natural keys; upsert on those to avoid duplicates.
- Backfill window: support `--since` (updated_at) to do incremental pulls; add `--full` for one-time baselines.

## Script outline (`pull-dealmachine.ts`)
```ts
// Pseudocode
const client = new DealMachineClient(env.DEALMACHINE_API_KEY);
const iter = client.iterContacts({ since, pageSize });
const tempCsv = tmp.file();
for await (row of iter) {
  const normalized = mapToIngestRow(row); // includes property + contact + phone classification
  csvWriter.write(normalized);
}
await ImportService.processDealMachineCsv(tempCsv.path, campaignId, { source: 'dealmachine-api' });
```

## Telemetry & safety
- Record each run in `IngestionJob` (start/end, duration, source, counts, errors).
- Guard rails: refuse to run without `DEALMACHINE_API_KEY`; require explicit `--campaign` unless `--dry-run` is passed.
- Provide `--dry-run` to fetch and summarize counts without writing to DB.

## Next steps
1) Add env parsing in `src/env.ts` for DealMachine vars.
2) Implement `src/services/dealMachineClient.ts` with paging + backoff.
3) Implement `src/scripts/pull-dealmachine.ts` (CLI options, temp CSV or direct stream).
4) Extend `ImportService` to accept `source` metadata and to skip duplicate contacts on the natural IDs.
5) Document usage in `backend/README.md`.
