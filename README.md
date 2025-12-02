### 1. High-level snapshot

You’re building a **simple-but-serious SMS engine for acquisitions**:

* **EzTexting** handles *all blasting and follow-up automation* (no fighting Twilio 10DLC rules for bulk).
* **Your backend** is the *brains*: import DealMachine CSVs → normalize Contacts/Properties → group into Campaigns → call EzTexting → ingest replies → manage DNC and pipeline statuses (negative / warm / hot / contacted).
* **Twilio** is the *office phone system*: main office number(s) for real calls + 1:1 texts once a relationship is formed; your backend just logs these events.

**Current state (conceptual):**

* We have: a clear architecture, table design (Prisma schema for Neon), file layout, and endpoint-level code skeletons for:

  * Creating campaigns
  * Importing CSVs
  * Blasting via EzTexting
  * Handling EzTexting webhooks (replies, DNC)
  * Logging Twilio office SMS/calls
  * Querying warm/hot leads
* Not done yet: actually wiring to **real EzTexting/Twilio APIs**, standing up Neon, and putting this code in a repo and running it.

**Critical unknowns / decisions:**

* Exact EzTexting REST API shapes (endpoints, auth, field names).
* Exact Twilio webhook payloads you’ll receive for the office number(s).
* Where you’ll host the Node app (Render/Fly/Railway/AWS/etc.).

---

## 2. System model: full picture

### 2.1 Architecture Overview

**Core components**

1. **Backend API (Node/TypeScript + Express)**

   * Single service (modular monolith).
   * Exposes:

     * `/api/campaigns` – create and launch campaigns.
     * `/api/imports/dealmachine` – CSV upload → Contacts/Properties/Targets.
     * `/api/leads` – list/filter leads by campaign/status.
     * `/webhooks/eztexting/*` – inbound replies from EzTexting.
     * `/webhooks/twilio/*` – inbound office SMS & call events from Twilio.
   * Encapsulates business rules:

     * Normalizes phone numbers (E.164).
     * DNC enforcement (`STOP`, etc.).
     * Classification into pipeline buckets (neg/warm/hot/contacted).
     * Relationship stage transitions (AUTOMATED → OFFICE).

2. **Database (Neon Postgres via Prisma)**

   * Persists contacts, properties, campaigns, campaign_targets, messages, DNC.
   * Neon used for both dev and prod:

     * `DATABASE_URL` → Neon pooled connection.
     * `DIRECT_URL` → Neon direct connection for Prisma migrations.

3. **EzTexting integration (Blast engine)**

   * Your backend never sends bulk SMS directly.
   * Backend does:

     * Create a **contact list** in EzTexting for each campaign.
     * Add phone numbers to the list.
     * Trigger a **campaign send** using a text template stored in your DB.
   * EzTexting:

     * Sends initial and (optionally) follow-up messages.
     * Calls your webhook on replies / status updates.

4. **Twilio integration (Office phone & 1:1 SMS)**

   * Twilio numbers are *not* used for blast.
   * Twilio used for:

     * Main office line receiving calls and texts.
     * Outbound 1:1 office SMS (e.g., from your CRM or custom UI).
   * Backend:

     * Logs inbound SMS and calls via webhooks.
     * Attaches them to the same Contact + CampaignTarget, flips `relationshipStage` to `OFFICE` as needed.

5. **Admin/ops UI (later)**

   * Thin Next.js app (or just Postman + a simple React UI for now) that:

     * Creates campaigns.
     * Uploads CSVs.
     * Views and filters leads.
     * Shows per-contact timeline.

**Boundaries**

* **Backend**: single Node/TS service.
* **DB**: Neon Postgres (external managed).
* **No internal queues** in v1. EzTexting handles scheduling, you handle state and ingest.
* **Third-party APIs**: EzTexting (bulk SMS), Twilio (office SMS/calls).

---

### 2.2 Tech Stack

* **Language**: TypeScript.
* **Framework**: Express for HTTP.
* **ORM**: Prisma.
* **Database**: Postgres on Neon.
* **HTTP clients**: `node-fetch` (or native `fetch` in Node 18+).
* **Optional**: Twilio SDK for office SMS.
* **Dev tooling**: `ts-node-dev` for hot reload, `dotenv` for env.

Pattern: **modular monolith** – one codebase, clear `routes/` + `services/` boundaries, no microservices.

---

### 2.3 Data & Databases

**Core entities (tables)**

* `Contact`

  * One row per phone number (normalized E.164).
  * Fields: `phoneE164`, `firstName`, `lastName`, `email`, `source`.
  * Relations: has many `Property`, `CampaignTarget`, `Message`.

* `Property`

  * One row per property from DealMachine, tied to a Contact.
  * Fields: address components, `externalSource`.
  * Relations: belongs to one `Contact`, has many `CampaignTarget`.

* `DncEntry`

  * Global DNC by phone.
  * Fields: `phoneE164`, `reason`, timestamps.
  * Used by *all* outbound logic (EzTexting and Twilio 1:1) as a gate.

* `Campaign`

  * Logical grouping of a blast.
  * Fields:

    * `name`, `description`.
    * `channel` (almost always `EZTEXTING_BULK` in this design).
    * `eztextingListId`, `eztextingCampId` (foreign IDs).
  * Relations: has many `CampaignTarget`, `Message` (template or logs).

* `CampaignTarget`

  * The per-campaign / per-contact relationship.
  * Fields:

    * `campaignId`, `contactId`, `propertyId`.
    * `status`: `PENDING_SEND`, `SENT`, `NO_RESPONSE`, `REPLIED_NEGATIVE`, `REPLIED_NEUTRAL`, `REPLIED_POSITIVE`, `CONTACTED`, `DNC`, `BOUNCED`.
    * `relationshipStage`: `AUTOMATED` (EzTexting only), `OFFICE` (Twilio/human), `CLOSED`.
    * `lastInboundAt`, `lastOutboundAt`, `lastMessageId`.
  * This is where your **pipeline** lives.

* `Message`

  * Every SMS (inbound/outbound, EzTexting or Twilio).
  * Fields:

    * `provider`: `EZTEXTING` or `TWILIO`.
    * `direction`: `OUTBOUND` or `INBOUND`.
    * `contactId`, `campaignId`, `campaignTargetId`.
    * `fromNumber`, `toNumber`, `body`, `createdAt`.

**Key constraints / indexes**

* `Contact.phoneE164` unique.
* `DncEntry.phoneE164` unique.
* Indexes:

  * `CampaignTarget(campaignId, status)`
  * `CampaignTarget(contactId)`
  * `Message(contactId, createdAt)`
  * `Message(campaignId, createdAt)`

**Population / consistency**

* `Contact` / `Property` / `CampaignTarget` populated via **CSV import**.
* `Campaign` created via `/api/campaigns`.
* `DncEntry` populated via:

  * STOP keywords from EzTexting replies.
  * STOP keywords or manual marks from Twilio office SMS.
* `Message` populated via:

  * Logging your template for initial EzTexting script.
  * EzTexting webhooks (inbound replies).
  * Twilio office webhooks (inbound SMS + calls).
* `CampaignTarget.status` & `relationshipStage` updated whenever:

  * You blast (mark `SENT`).
  * You receive reply (classify).
  * You log office interaction (flip to `OFFICE`).

---

### 2.4 File & Module Structure

Suggested backend layout:

```text
backend/
  package.json
  tsconfig.json
  .env          # DATABASE_URL, DIRECT_URL, EZTEXTING_*, TWILIO_* etc.
  prisma/
    schema.prisma

  src/
    env.ts
    db.ts
    server.ts

    eztextingClient.ts
    twilioClient.ts

    routes/
      campaigns.ts          # create + launch campaigns
      imports.ts            # DealMachine CSV upload
      webhooksEzTexting.ts  # reply/DNC ingest
      webhooksTwilio.ts     # office SMS/call ingest
      leads.ts              # lead pipeline API
```

* **Business logic** mostly in route handlers and small helpers (`classifyReply`, `normalizePhone`).
* **Glue/infra**:

  * `server.ts` – Express wiring.
  * `env.ts` – config loader.
  * `db.ts` – Prisma client.
  * `eztextingClient.ts` / `twilioClient.ts` – HTTP/SMS client wrappers.

No heavy service layer for v1; we can introduce `services/` later if needed.

---

## 3. Cleaned-up scope: what actually matters now

### In scope (v1)

1. **Data & DB**

   * Neon Postgres via Prisma (`Contact`, `Property`, `Campaign`, `CampaignTarget`, `Message`, `DncEntry`).
2. **Campaigns**

   * Create a campaign with a single initial script/message.
   * Launch: create EzTexting list, add contacts, send the script.
3. **DealMachine CSV import**

   * Parse known headers: `Address`, `City`, `State`, `Zip`, `Owner Name`, `Phone`.
   * Normalize phone numbers; create/update Contact + Property; create CampaignTarget with `PENDING_SEND`.
4. **EzTexting integration**

   * Simple: create list → add contacts → send campaign.
   * Webhook: ingest replies, update statuses and DNC, flip `relationshipStage` → `OFFICE` on positive reply.
5. **Twilio office integration (logging only)**

   * Inbound SMS → log Message + flip to `OFFICE` if automated.
   * Call events → at least bump `status` to `CONTACTED`.
6. **Lead pipeline API**

   * Filter by `campaignId` and `status` (e.g. `REPLIED_POSITIVE` for hot).

### Deferred / archive

* **Internal queueing or follow-up scheduler**:

  * You’re letting EzTexting handle follow-up automation for now.
  * We don’t need BullMQ/Redis v1.
* **Twilio 10DLC bulk sending**:

  * Out of scope; Twilio is strictly office 1:1, not blast.
* **Complex multi-line routing and per-rep analytics**:

  * Start with “office touched this lead” concept; rep-specific metrics later.
* **Full-blown admin UI**:

  * For v1, simple endpoints + a minimal table UI or even Postman is enough.

### Decisions still needed

* Exact EzTexting endpoints / payloads:

  * Which version of their API, path names for lists/contacts/campaigns, webhook payload format.
* Hosting:

  * Where you’ll run the Node app (Render/Fly/Railway/etc.).
* Authentication:

  * Is this an internal-only tool behind VPN, or do you need auth (API keys/JWT)?

---

## 4. Implementation checklist (ordered, actionable)

### Phase 0 – Repo & environment

* [x] Decide on architecture: single Node/TS backend with Prisma + Neon + EzTexting + Twilio Office.

  * *Done conceptually in this doc.*
* [ ] Create Git repo `monthaven-sms` with `backend/` folder and commit skeleton files.

  * Stand up the structure shown in §2.4 so everything has a place.

---

### Phase 1 – Data layer (Neon + Prisma)

* [ ] Sign up for Neon and create a Postgres project.

  * Get both pooled and direct connection URLs.

* [ ] Set up `.env` with Neon URLs.

  ```env
  DATABASE_URL="postgresql://user:pw@ep-xxxxx-pooler.region.aws.neon.tech/db?sslmode=require"
  DIRECT_URL="postgresql://user:pw@ep-xxxxx.region.aws.neon.tech/db?sslmode=require"
  ```

* [ ] Update `prisma/schema.prisma` with datasource pointing at Neon:

  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```

* [ ] Define Prisma models for:

  * `Contact`, `Property`, `DncEntry`, `Campaign`, `CampaignTarget`, `Message` as described in §2.3.

* [ ] Run:

  ```bash
  cd backend
  npm install
  npx prisma generate
  npm run prisma:migrate
  ```

  * This creates the schema in Neon.

---

### Phase 2 – Core backend skeleton

* [ ] Create `src/env.ts` to load env vars and fail fast if missing.

* [ ] Create `src/db.ts` with Prisma client instance.

* [ ] Create `src/server.ts`:

  * Use Express.
  * Add CORS, JSON body parsing.
  * Add `/health` endpoint.
  * Mount route modules:

    * `/api/campaigns`
    * `/api/imports`
    * `/api/leads`
    * `/webhooks/eztexting`
    * `/webhooks/twilio`
  * Add a simple error handler.

* [ ] Add TypeScript config (`tsconfig.json`) and `ts-node-dev` dev script.

---

### Phase 3 – Campaigns & template storage

* [ ] Implement `src/routes/campaigns.ts`:

  * [ ] `POST /api/campaigns`

    * Accepts `{ name, description?, initialMessage }`.
    * Creates a `Campaign` row.
    * Stores `initialMessage` as a `Message` template associated to the campaign (could use `fromNumber='template'` etc.).
  * [ ] `POST /api/campaigns/:id/launch`

    * Fetches `Campaign` + its template and `CampaignTarget`s.
    * Calls EzTexting to:

      * Create a list (if not already existing).
      * Add contacts.
      * Send the campaign message.
    * Updates:

      * `Campaign.eztextingListId` and `.eztextingCampId`.
      * `CampaignTarget.status = 'SENT'` and `lastOutboundAt = now`.

* [ ] Keep template handling simple: 1 template per campaign stored as a `Message` row.

---

### Phase 4 – DealMachine CSV import

* [ ] Implement `src/routes/imports.ts`:

  * [ ] Use `multer` to handle file upload (`file` field).
  * [ ] Endpoint: `POST /api/imports/dealmachine?campaignId=:id`.
  * [ ] Parse CSV as text:

    * Expect header line containing: `Address`, `City`, `State`, `Zip`, `Owner Name`, `Phone`.
    * For each row:

      * Normalize `Phone` to E.164 (`+1XXXXXXXXXX`) or skip if invalid.
      * Split `Owner Name` into `firstName` + `lastName`.
      * `upsert` `Contact` by `phoneE164`.
      * Create `Property` row for the contact.
      * Create `CampaignTarget` with `campaignId`, `contactId`, `propertyId`, `status='PENDING_SEND'`, `relationshipStage='AUTOMATED'`.

* [ ] Return `{ campaignId, processed }` and log any skipped rows for debugging.

---

### Phase 5 – EzTexting integration (blast + replies)

* [ ] Implement `src/eztextingClient.ts`:

  * [ ] Read `EZTEXTING_API_KEY` and `EZTEXTING_API_BASE` from `env`.
  * [ ] Methods:

    * `createContactList(name): Promise<string>`
    * `addContactsToList(listId, contacts: {phone, firstName?, lastName?}[])`
    * `sendCampaign(listId, message): Promise<string>`
  * [ ] Each method:

    * Uses `fetch` with proper headers: `Authorization: Bearer {key}` or whatever EzTexting requires.
    * Throws detailed errors on non-2xx.

* [ ] Wire into `campaignsRouter.launch`:

  * Create list name like `camp_${campaign.id}`.
  * Map `CampaignTarget` → `contacts[]`.
  * Call `createContactList` → `listId`.
  * Call `addContactsToList(listId, contacts)`.
  * Call `sendCampaign(listId, template.body)` → `campaignId`.
  * Update `Campaign` with `eztextingListId` and `eztextingCampId`.

* [ ] Implement `src/routes/webhooksEzTexting.ts`:

  * [ ] `POST /webhooks/eztexting/inbound`:

    * Parse EzTexting payload (you’ll adjust to their spec; assume `from`, `to`, `message`, `campaignId`).
    * Normalize `from` to E.164, find or create `Contact`.
    * Create `Message` with `provider='EZTEXTING'`, `direction='INBOUND'`.
    * Find most recent `CampaignTarget` for that contact (and campaignId if provided).
    * Classify reply into status:

      * STOP/“not interested” → `REPLIED_NEGATIVE`.
      * “maybe”/“send info” → `REPLIED_NEUTRAL`.
      * “yes”/“call me”/“interested” → `REPLIED_POSITIVE`.
      * Otherwise → `CONTACTED` unless already warm/hot.
    * If STOP keyword:

      * `upsert` into `DncEntry` for that phone.
      * Optionally set `CampaignTarget.status='DNC'`.
    * If positive:

      * Set `relationshipStage='OFFICE'`.
    * Update `lastInboundAt`/`lastMessageId`.

* [ ] Configure EzTexting dashboard to send its reply webhook to:

  * `POST https://your-domain.com/webhooks/eztexting/inbound`.

---

### Phase 6 – Twilio office integration (logging + relationship flip)

* [ ] Implement `src/twilioClient.ts` for optional office outbound SMS:

  * [ ] Create Twilio client from `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
  * [ ] `sendOfficeSms(to, body)`:

    * Uses `TWILIO_MAIN_FROM` as `from`.
    * Logs or returns message SID.

* [ ] Implement `src/routes/webhooksTwilio.ts`:

  * [ ] `POST /webhooks/twilio/sms`:

    * Parse Twilio standard form body: `From`, `To`, `Body`.
    * Normalize `From` to E.164 and find or create `Contact`.
    * Create `Message` with `provider='TWILIO'`, `direction='INBOUND'`.
    * For any `CampaignTarget` with that contact and `relationshipStage='AUTOMATED'`, update:

      * `relationshipStage='OFFICE'`, `status='CONTACTED'`, `lastInboundAt`, `lastMessageId`.
    * Return TwiML `<Response></Response>`.

  * [ ] `POST /webhooks/twilio/call`:

    * Parse `From`, `CallStatus`, etc.
    * At minimum, bump `status='CONTACTED'` and `relationshipStage='OFFICE'` for targets with matching contact.
    * Return `<Response></Response>`.

* [ ] Configure Twilio console:

  * Inbound SMS webhook → `/webhooks/twilio/sms`.
  * Voice status webhook → `/webhooks/twilio/call`.

---

### Phase 7 – Lead pipeline API

* [ ] Implement `src/routes/leads.ts`:

  * [ ] `GET /api/leads?campaignId=&status=`:

    * Build `where` filter from query params (optional).
    * `include: { contact, property, campaign }`.
    * Return JSON.
  * [ ] (Optional) `GET /api/leads/export`:

    * Same, but stream CSV file for download.

* [ ] Later: small React UI that hits this endpoint and renders a table with filters.

---

### Phase 8 – Infra & DevOps

* [ ] Add logging:

  * Use `console.log` initially with structured messages:

    * On EzTexting send, log campaign ID + contact count.
    * On EzTexting/Twilio webhooks, log phone, body, classification.
* [ ] Decide hosting (e.g. Render):

  * Add Dockerfile if needed, or deploy Node app directly.
  * Configure environment variables in hosting provider.
* [ ] Point:

  * EzTexting webhooks → deployed `/webhooks/eztexting/inbound` URL.
  * Twilio webhooks → deployed `/webhooks/twilio/*` URLs.
* [ ] Add simple monitoring:

  * Health check endpoint monitored by hosting platform.
  * Optionally log errors to a service (Sentry/Logtail/etc.).

---

## 5. Risk, edge cases, and design sanity checks

1. **DNC leakage**

   * Risk: sending texts to numbers that have already sent STOP or been manually marked DNC.
   * Mitigation:

     * Always check `DncEntry` before:

       * Adding a contact to an EzTexting list.
       * Allowing `sendOfficeSms`.
     * Add tests: simulate STOP via EzTexting and Twilio, then confirm subsequent sends are blocked.

2. **EzTexting payload mismatch**

   * Risk: your webhook parsing assumptions don’t match their actual payloads, so no messages get classified.
   * Mitigation:

     * Start by logging raw webhook bodies to console or a `WebhookLog` table.
     * Implement mapping after seeing real payloads; keep classifier logic isolated.

3. **Contact deduplication**

   * Risk: same owner appears multiple times in CSV with slight phone formatting differences → duplicate Contacts, fragmented history.
   * Mitigation:

     * Central `normalizePhone` function used *everywhere*.
     * Enforce `Contact.phoneE164` unique and always prefer `upsert`.

4. **Ambiguous owner + multiple properties**

   * Risk: same phone tied to multiple properties, but replies don’t clearly reference which property.
   * Mitigation:

     * Attach reply to most recent `CampaignTarget` for that contact.
     * Show all their properties in UI, but keep decision simple for now.

5. **Race conditions on status updates**

   * Low risk in v1 (single-node backend, no queues), but:
   * Mitigation:

     * Use `updateMany` only for broad updates where idempotence is fine.
     * Keep classification functions pure and stateless.

6. **Security / unauthorized access**

   * Risk: open endpoints exposed to internet; someone could spam webhooks or call APIs.
   * Mitigation:

     * Protect `/api/*` with basic auth or API key (env-configured).
     * Limit webhook endpoints to EzTexting/Twilio IPs if they publish ranges (or at least add a shared secret / signature check).

7. **Neon connection/idle issues**

   * Risk: cold starts / connection limits due to serverless nature.
   * Mitigation:

     * Use the Neon **pooler** in `DATABASE_URL` and direct URL only for migrations (already in the plan).
     * Configure low Prisma pool sizes.

---

## 6. Refinements to the architecture or plan

1. **Conversation abstraction**

   * If timelines become messy, introduce a `Conversation` table:

     * `Conversation(contactId, channel, officeLine?)`.
     * `Message` belongs to a `Conversation`.
   * Gain: cleaner UI and analytics; cost: extra join + migration.

2. **Compound unique index on `CampaignTarget`**

   * Add:

     ```prisma
     @@unique([campaignId, contactId, propertyId], name: "campaign_contact_property_unique")
     ```

   * Gain: prevents duplicate targets for same contact/property; cost: small migration.

3. **Separate “template messages” from “real messages”**

   * Add a `Template` or `MessageTemplate` model rather than overloading `Message`.
   * Gain: easier to reason about logs vs templates; cost: extra small model + migration.

4. **Simple scoring instead of only enums**

   * Add `score` field on `CampaignTarget` that increments on positive replies, calls, etc.
   * Gain: quick one-number prioritization; cost: trivial.

None of these are required for v1, but they’re low-cost improvements once core pipeline works.

---

## 7. Immediate next steps (for you, right now)

Each of these is a 30–90 minute unit of work.

1. **Lock the DB in Neon**

   * Create Neon project, copy pooled + direct URLs into `.env`, run `prisma migrate` to get a live DB.

2. **Stand up the backend skeleton**

   * Create `backend/` with `package.json`, `tsconfig.json`, `env.ts`, `db.ts`, `server.ts`, and one dummy route (`GET /health`) and run `npm run dev` until it works.

3. **Implement and test the data models locally**

   * Add `schema.prisma` models, run migrations, and quickly test via `npx prisma studio` that you can create `Contact` and `Campaign` rows.

4. **Wire campaigns + CSV import**

   * Implement `campaigns.ts` and `imports.ts` as described, then:

     * Create a campaign via POST.
     * Import a tiny mock CSV.
     * Check Neon to ensure contacts/properties/targets look correct.

5. **Stub EzTexting client with logging**

   * Implement `eztextingClient.ts` but initially just log the payload instead of calling real API.
   * Confirm `POST /api/campaigns/:id/launch` logs contacts and message correctly.

6. **Connect real EzTexting sandbox**

   * Replace logging with real EzTexting API calls, using their docs to set exact paths and payloads.
   * Launch a test campaign to your own phone and confirm messages arrive.

7. **Add basic webhook handling**

   * Implement `webhooksEzTexting.ts` to ingest replies, log to DB, and update statuses.
   * In EzTexting UI, configure reply webhook to your dev tunnel (ngrok) and verify replies show up as `Message` + updated `CampaignTarget`.

Once you’ve done that, you’ll have the core loop working: **CSV → campaign → blast → reply → pipeline**, all persisted in Neon and ready to hook into Twilio office logging and a simple UI.
I’ll treat what we already designed as “the spec” and now give you a complete, drop-in backend codebase for:

DealMachine CSV → Contacts / Properties / CampaignTargets

Campaign creation + launch via EzTexting (blast only)

EzTexting reply webhook → statuses (neg / warm / hot / DNC) + relationshipStage

Twilio office SMS / call webhooks → logging + relationshipStage flip

Lead pipeline API

Postgres on Neon via Prisma

I’ll still roughly follow your sections 1–7, but keep them tight and then spend most of the answer on code.

1. High-level snapshot

System goal: simple, production-capable SMS engine for acquisitions:

Bulk blasting + follow-ups via EzTexting.

State, DNC, lead pipeline, and contact history in your Postgres (Neon).

Human office calls/SMS via Twilio, logged into the same DB.

This answer gives you a single Node/TypeScript backend with:

Full Prisma schema.

All route handlers.

EzTexting + Twilio client wrappers.

Express server wiring.

You (or a dev) will need to:

Plug in real EzTexting endpoints and payload shapes.

Plug in Twilio credentials and webhook URLs.

Deploy the Node app and configure webhooks.

2. System model: full picture (compressed)

Architecture: One Node/TS service (Express) talking to Neon Postgres via Prisma; integrations with EzTexting (HTTP) and Twilio (SDK + webhooks).

Tech stack: TypeScript, Express, Prisma, Neon Postgres, Twilio SDK; no Redis/queues in v1 (EzTexting handles timing).

Data: Tables: Contact, Property, DncEntry, Campaign, CampaignTarget, Message.

File structure:

backend/
  package.json
  tsconfig.json
  .env           # you create this
  prisma/
    schema.prisma
  src/
    env.ts
    db.ts
    server.ts
    eztextingClient.ts
    twilioClient.ts
    routes/
      campaigns.ts
      imports.ts
      leads.ts
      webhooksEzTexting.ts
      webhooksTwilio.ts
    utils/
      smsLogic.ts
      phone.ts

3. Cleaned-up scope (v1)

In-scope:

Neon schema + migrations.

DealMachine CSV upload → Contact / Property / CampaignTarget.

POST /api/campaigns + POST /api/campaigns/:id/launch.

EzTexting: create contact list, add contacts, send campaign.

EzTexting inbound webhook: classify replies, DNC.

Twilio inbound office SMS + call webhooks: log + flip to OFFICE.

GET /api/leads for pipeline.

Out-of-scope:

Internal queues, follow-up scheduler (EzTexting handles follow-ups).

Twilio bulk sending/10DLC.

Full UI (you can add Next.js/frontend later).

4. Implementation checklist (very short now)

Everything below is code to implement these checklist items:

 Create repo and backend folder, paste files.

 Configure Neon and .env.

 Run npm install, npx prisma generate, npm run prisma:migrate.

 Run npm run dev and hit /health.

 Configure EzTexting and Twilio webhooks to hit your deployed URLs.

From here on: all the code.

I’ll assume:

Node 18+ so global fetch exists.

You’re okay with CommonJS modules (simpler with ts-node-dev + Twilio).

5. Code: backend
5.1 backend/package.json
{
  "name": "monthaven-sms-backend",
  "version": "0.1.0",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.19.0",
    "multer": "^1.4.5",
    "twilio": "^5.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.7",
    "@types/node": "^20.0.0",
    "prisma": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  }
}

5.2 backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src"]
}

5.3 backend/.env (example – you fill real values)
NODE_ENV=development
PORT=4000

# Neon pooled connection for runtime
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
# Neon direct connection for migrations/CLI
DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxxxx.region.aws.neon.tech/neondb?sslmode=require"

# EzTexting
EZTEXTING_API_KEY=your_eztexting_api_key
EZTEXTING_API_BASE=https://api.eztexting.com/v1

# Twilio office (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_MAIN_FROM=+1xxxxxxxxxx

5.4 backend/prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Contact {
  id          String         @id @default(cuid())
  phoneE164   String         @unique
  firstName   String?
  lastName    String?
  email       String?
  source      ContactSource  @default(DEALMACHINE_CSV)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  properties  Property[]
  targets     CampaignTarget[]
  messages    Message[]
}

enum ContactSource {
  DEALMACHINE_CSV
  MANUAL
  OTHER
}

model Property {
  id             String           @id @default(cuid())
  owner          Contact          @relation(fields: [ownerId], references: [id])
  ownerId        String

  addressLine1   String
  city           String
  state          String
  postalCode     String
  externalSource String?

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  targets        CampaignTarget[]
}

model DncEntry {
  id         String   @id @default(cuid())
  phoneE164  String   @unique
  reason     String?
  createdAt  DateTime @default(now())
}

model Campaign {
  id               String            @id @default(cuid())
  name             String
  description      String?
  channel          CampaignChannel   @default(EZTEXTING_BULK)
  eztextingListId  String?
  eztextingCampId  String?

  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  targets          CampaignTarget[]
  messages         Message[]
}

enum CampaignChannel {
  EZTEXTING_BULK
  OFFICE_TWILIO
}

model CampaignTarget {
  id               String                @id @default(cuid())
  campaign         Campaign              @relation(fields: [campaignId], references: [id])
  campaignId       String

  contact          Contact               @relation(fields: [contactId], references: [id])
  contactId        String

  property         Property?             @relation(fields: [propertyId], references: [id])
  propertyId       String?

  status           CampaignTargetStatus  @default(PENDING_SEND)
  relationshipStage RelationshipStage    @default(AUTOMATED)

  lastInboundAt    DateTime?
  lastOutboundAt   DateTime?
  lastMessageId    String?

  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  messages         Message[]
}

enum CampaignTargetStatus {
  PENDING_SEND
  SENT
  NO_RESPONSE
  REPLIED_NEGATIVE
  REPLIED_NEUTRAL
  REPLIED_POSITIVE
  CONTACTED
  DNC
  BOUNCED
}

enum RelationshipStage {
  AUTOMATED
  OFFICE
  CLOSED
}

model Message {
  id                String           @id @default(cuid())
  provider          MessageProvider
  direction         MessageDirection

  contact           Contact?         @relation(fields: [contactId], references: [id])
  contactId         String?

  campaign          Campaign?        @relation(fields: [campaignId], references: [id])
  campaignId        String?

  campaignTarget    CampaignTarget?  @relation(fields: [campaignTargetId], references: [id])
  campaignTargetId  String?

  fromNumber        String
  toNumber          String
  body              String

  createdAt         DateTime         @default(now())
}

enum MessageProvider {
  EZTEXTING
  TWILIO
}

enum MessageDirection {
  OUTBOUND
  INBOUND
}


Then run from backend:

npm install
npx prisma generate
npm run prisma:migrate

5.5 backend/src/env.ts
import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required('DATABASE_URL'),
  DIRECT_URL: required('DIRECT_URL'),

  EZTEXTING_API_KEY: required('EZTEXTING_API_KEY'),
  EZTEXTING_API_BASE: required('EZTEXTING_API_BASE'),

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_MAIN_FROM: process.env.TWILIO_MAIN_FROM ?? ''
};

5.6 backend/src/db.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

5.7 backend/src/utils/phone.ts
// Normalize US phone numbers into E.164 format (+1XXXXXXXXXX)
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

5.8 backend/src/utils/smsLogic.ts
import { CampaignTargetStatus } from '@prisma/client';

export function isStopKeyword(text: string): boolean {
  const t = text.trim().toUpperCase();
  return ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(t);
}

export function classifyReply(raw: string, current: CampaignTargetStatus): CampaignTargetStatus {
  const text = raw.toLowerCase();

  if (isStopKeyword(raw) || text.includes('wrong number') || text.includes('not interested')) {
    return CampaignTargetStatus.REPLIED_NEGATIVE;
  }
  if (text.includes('maybe') || text.includes('info') || text.includes('follow up')) {
    return CampaignTargetStatus.REPLIED_NEUTRAL;
  }
  if (text.includes('yes') || text.includes('call me') || text.includes('interested')) {
    return CampaignTargetStatus.REPLIED_POSITIVE;
  }
  if (
    current === CampaignTargetStatus.REPLIED_POSITIVE ||
    current === CampaignTargetStatus.REPLIED_NEUTRAL
  ) {
    return current;
  }
  return CampaignTargetStatus.CONTACTED;
}

5.9 backend/src/eztextingClient.ts

Note: Endpoints/fields are placeholders – you must adjust them to match EzTexting’s actual API. Structure and error handling are correct.

import { env } from './env';

interface EzTextingContact {
  phone: string;
  firstName?: string;
  lastName?: string;
}

export class EzTextingClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.EZTEXTING_API_KEY;
    this.baseUrl = env.EZTEXTING_API_BASE.replace(/\/$/, '');
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
      // Adjust if EzTexting uses a different auth scheme
    };
  }

  async createContactList(name: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/lists`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting create list failed: ${res.status} ${text}`);
    }
    const data: any = await res.json();
    return String(data.id ?? data.listId);
  }

  async addContactsToList(listId: string, contacts: EzTextingContact[]): Promise<void> {
    if (!contacts.length) return;
    const res = await fetch(`${this.baseUrl}/lists/${encodeURIComponent(listId)}/contacts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ contacts })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting add contacts failed: ${res.status} ${text}`);
    }
  }

  async sendCampaign(listId: string, message: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/campaigns`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ listId, message })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting send campaign failed: ${res.status} ${text}`);
    }
    const data: any = await res.json();
    return String(data.id ?? data.campaignId);
  }
}

export const ezTextingClient = new EzTextingClient();

5.10 backend/src/twilioClient.ts
import { env } from './env';
import twilio from 'twilio';

const hasTwilio = !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_MAIN_FROM;

export const twilioClient = hasTwilio
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendOfficeSms(to: string, body: string): Promise<string> {
  if (!twilioClient || !env.TWILIO_MAIN_FROM) {
    throw new Error('Twilio not configured');
  }
  const msg = await twilioClient.messages.create({
    to,
    from: env.TWILIO_MAIN_FROM,
    body
  });
  return msg.sid;
}

5.11 backend/src/routes/campaigns.ts
import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import { ezTextingClient } from '../eztextingClient';
import { MessageDirection, MessageProvider } from '@prisma/client';

export const campaignsRouter = Router();

const createCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  initialMessage: z.string().min(5)
});

// Create campaign with one initial message template
campaignsRouter.post('/', async (req, res, next) => {
  try {
    const data = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description
      }
    });

    // Store template as a Message row
    await prisma.message.create({
      data: {
        provider: MessageProvider.EZTEXTING,
        direction: MessageDirection.OUTBOUND,
        body: data.initialMessage,
        fromNumber: 'TEMPLATE',
        toNumber: 'TEMPLATE',
        campaignId: campaign.id
      }
    });

    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

// Launch campaign via EzTexting
campaignsRouter.post('/:id/launch', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        targets: { include: { contact: true } },
        messages: true
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const template = campaign.messages[0];
    if (!template) {
      return res.status(400).json({ error: 'No initial message template for campaign' });
    }

    // Build contact list for EzTexting
    const listId = await ezTextingClient.createContactList(`camp_${campaign.id}`);

    const contacts = campaign.targets
      .filter(t => !!t.contact)
      .map(t => ({
        phone: t.contact!.phoneE164,
        firstName: t.contact!.firstName ?? undefined,
        lastName: t.contact!.lastName ?? undefined
      }));

    await ezTextingClient.addContactsToList(listId, contacts);
    const ezCampId = await ezTextingClient.sendCampaign(listId, template.body);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        eztextingListId: listId,
        eztextingCampId: ezCampId
      }
    });

    await prisma.campaignTarget.updateMany({
      where: { campaignId: campaign.id },
      data: {
        status: 'SENT',
        lastOutboundAt: new Date()
      }
    });

    res.json({
      ok: true,
      listId,
      ezCampId,
      sentTo: contacts.length
    });
  } catch (err) {
    next(err);
  }
});

5.12 backend/src/routes/imports.ts
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db';
import { normalizePhone } from '../utils/phone';
import { ContactSource } from '@prisma/client';

const upload = multer();
export const importsRouter = Router();

// Expected CSV headers: Address, City, State, Zip, Owner Name, Phone
importsRouter.post('/dealmachine', upload.single('file'), async (req, res, next) => {
  try {
    const campaignId = String(req.query.campaignId ?? '');
    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const csv = req.file.buffer.toString('utf8');
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV appears to be empty' });
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());

    const idx = {
      address: headers.indexOf('Address'),
      city: headers.indexOf('City'),
      state: headers.indexOf('State'),
      zip: headers.indexOf('Zip'),
      ownerName: headers.indexOf('Owner Name'),
      phone: headers.indexOf('Phone')
    };

    if (
      idx.address === -1 ||
      idx.city === -1 ||
      idx.state === -1 ||
      idx.zip === -1 ||
      idx.ownerName === -1 ||
      idx.phone === -1
    ) {
      return res.status(400).json({ error: 'CSV missing one or more required headers' });
    }

    let processed = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split(',').map(c => c.trim());
      const rawPhone = cells[idx.phone] ?? '';
      const phone = normalizePhone(rawPhone);
      if (!phone) continue;

      const ownerName = cells[idx.ownerName] ?? '';
      const [firstName, ...rest] = ownerName.split(' ').filter(Boolean);
      const lastName = rest.join(' ') || null;

      const contact = await prisma.contact.upsert({
        where: { phoneE164: phone },
        update: {},
        create: {
          phoneE164: phone,
          firstName: firstName || null,
          lastName,
          source: ContactSource.DEALMACHINE_CSV
        }
      });

      const property = await prisma.property.create({
        data: {
          ownerId: contact.id,
          addressLine1: cells[idx.address] ?? '',
          city: cells[idx.city] ?? '',
          state: cells[idx.state] ?? '',
          postalCode: cells[idx.zip] ?? '',
          externalSource: 'DealMachine'
        }
      });

      await prisma.campaignTarget.create({
        data: {
          campaignId,
          contactId: contact.id,
          propertyId: property.id,
          status: 'PENDING_SEND',
          relationshipStage: 'AUTOMATED'
        }
      });

      processed++;
    }

    res.json({ campaignId, processed });
  } catch (err) {
    next(err);
  }
});

5.13 backend/src/routes/leads.ts
import { Router } from 'express';
import { prisma } from '../db';

export const leadsRouter = Router();

// GET /api/leads?campaignId=...&status=REPLIED_POSITIVE
leadsRouter.get('/', async (req, res, next) => {
  try {
    const { campaignId, status } = req.query;
    const where: any = {};

    if (campaignId) where.campaignId = String(campaignId);
    if (status) where.status = String(status);

    const targets = await prisma.campaignTarget.findMany({
      where,
      include: {
        contact: true,
        property: true,
        campaign: true
      }
    });

    res.json(targets);
  } catch (err) {
    next(err);
  }
});

5.14 backend/src/routes/webhooksEzTexting.ts

Adjust the body field names to match EzTexting’s actual webhook payload. Here we assume { from, to, message, campaignId }.

import { Router } from 'express';
import { prisma } from '../db';
import {
  CampaignTargetStatus,
  MessageDirection,
  MessageProvider,
  RelationshipStage
} from '@prisma/client';
import { normalizePhone } from '../utils/phone';
import { classifyReply, isStopKeyword } from '../utils/smsLogic';

export const webhooksEzTextingRouter = Router();

interface EzTextingWebhookBody {
  from?: string;
  to?: string;
  message?: string;
  campaignId?: string;
}

// Inbound EzTexting replies
webhooksEzTextingRouter.post('/inbound', async (req, res, next) => {
  try {
    const body = req.body as EzTextingWebhookBody;
    const phone = normalizePhone(body.from ?? '');
    const to = body.to ?? '';
    const text = body.message ?? '';
    const campaignId = body.campaignId ?? undefined;

    if (!phone) {
      console.warn('EzTexting inbound: invalid from phone', body.from);
      return res.json({ ok: true });
    }

    let contact = await prisma.contact.findUnique({ where: { phoneE164: phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneE164: phone,
          source: 'OTHER'
        }
      });
    }

    const msg = await prisma.message.create({
      data: {
        provider: MessageProvider.EZTEXTING,
        direction: MessageDirection.INBOUND,
        contactId: contact.id,
        campaignId,
        fromNumber: phone,
        toNumber: to,
        body: text
      }
    });

    const target = await prisma.campaignTarget.findFirst({
      where: {
        contactId: contact.id,
        ...(campaignId ? { campaignId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (target) {
      const newStatus: CampaignTargetStatus = classifyReply(text, target.status);

      // STOP / DNC
      if (isStopKeyword(text)) {
        await prisma.dncEntry.upsert({
          where: { phoneE164: phone },
          update: {},
          create: { phoneE164: phone, reason: 'STOP via EzTexting' }
        });
      }

      const newStage =
        newStatus === CampaignTargetStatus.REPLIED_POSITIVE
          ? RelationshipStage.OFFICE
          : target.relationshipStage;

      await prisma.campaignTarget.update({
        where: { id: target.id },
        data: {
          status: newStatus,
          relationshipStage: newStage,
          lastInboundAt: new Date(),
          lastMessageId: msg.id
        }
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

5.15 backend/src/routes/webhooksTwilio.ts
import { Router } from 'express';
import { prisma } from '../db';
import {
  CampaignTargetStatus,
  MessageDirection,
  MessageProvider,
  RelationshipStage
} from '@prisma/client';
import { normalizePhone } from '../utils/phone';

export const webhooksTwilioRouter = Router();

// Twilio inbound SMS
// Twilio sends application/x-www-form-urlencoded; Express urlencoded middleware handles this in server.ts
webhooksTwilioRouter.post('/sms', async (req, res, next) => {
  try {
    const { From, To, Body } = req.body as { From?: string; To?: string; Body?: string };

    const phone = normalizePhone(From ?? '');
    const to = To ?? '';
    const text = Body ?? '';

    if (!phone) {
      console.warn('Twilio inbound: invalid From', From);
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    let contact = await prisma.contact.findUnique({ where: { phoneE164: phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneE164: phone,
          source: 'OTHER'
        }
      });
    }

    const msg = await prisma.message.create({
      data: {
        provider: MessageProvider.TWILIO,
        direction: MessageDirection.INBOUND,
        contactId: contact.id,
        fromNumber: phone,
        toNumber: to,
        body: text
      }
    });

    // Flip any automated targets for this contact into OFFICE / CONTACTED
    await prisma.campaignTarget.updateMany({
      where: {
        contactId: contact.id,
        relationshipStage: RelationshipStage.AUTOMATED
      },
      data: {
        relationshipStage: RelationshipStage.OFFICE,
        status: CampaignTargetStatus.CONTACTED,
        lastInboundAt: new Date(),
        lastMessageId: msg.id
      }
    });

    res.type('text/xml').send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

// Twilio call webhook (basic status logging)
// Configure this as voice webhook for main office number if you want.
webhooksTwilioRouter.post('/call', async (req, res, next) => {
  try {
    const { From } = req.body as { From?: string };
    const phone = normalizePhone(From ?? '');
    if (!phone) {
      console.warn('Twilio call: invalid From', From);
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    // Mark any targets as contacted & OFFICE
    await prisma.campaignTarget.updateMany({
      where: {
        contact: { phoneE164: phone }
      },
      data: {
        relationshipStage: RelationshipStage.OFFICE,
        status: CampaignTargetStatus.CONTACTED
      }
    });

    res.type('text/xml').send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

5.16 backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { env } from './env';
import { campaignsRouter } from './routes/campaigns';
import { importsRouter } from './routes/imports';
import { leadsRouter } from './routes/leads';
import { webhooksEzTextingRouter } from './routes/webhooksEzTexting';
import { webhooksTwilioRouter } from './routes/webhooksTwilio';

const app = express();

// CORS + body parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/leads', leadsRouter);

// Webhooks
app.use('/webhooks/eztexting', webhooksEzTextingRouter);
app.use('/webhooks/twilio', webhooksTwilioRouter);

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal error' });
});

app.listen(env.PORT, () => {
  console.log(`Monthaven SMS backend listening on :${env.PORT}`);
});

6. Risks & sanity checks (specific to this code)

EzTexting API mismatch

You must adapt eztextingClient and webhooksEzTexting to their real endpoints and fields.

Webhook security

Right now, no auth on webhooks. In production:

Use shared secrets or signature verification if EzTexting/Twilio support it.

CSV robustness

Parser is simple; if DealMachine changes headers, it’ll break.

Later: add header mapping or tolerant parsing.

Neon connections

Prisma + Neon pooling is configured, but watch connection limits; you can adjust Prisma pool config if needed.

7. Immediate next steps

Create repo + paste code

mkdir monthaven-sms && cd monthaven-sms && mkdir backend and create the files exactly as above.

Set up Neon and .env

Get pooled + direct URLs from Neon, fill .env accordingly, plus stub EzTexting/Twilio vars.

Install & migrate

cd backend && npm install && npx prisma generate && npm run prisma:migrate.

Run locally

npm run dev and hit http://localhost:4000/health.

Smoke test flows

Manually add a campaign, fake CSV, launch, verify DB changes with npx prisma studio.

Wire real providers

Update eztextingClient and webhooksEzTexting to match their docs; hook webhooks via ngrok in dev; then do the same for Twilio.

Once you do those, you’ll have a working v1 spine: CSV → campaign → EzTexting blast → reply → statuses/DNC → Twilio office logging, all backed by Neon.

Extended thinking
ChatGPT can make mistakes. OpenAI doesn't use Monthaven Capital workspace data to train its models.