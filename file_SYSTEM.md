```js
sms/
├── sms/
│   ├── frontend/
│   │   ├── app/
│   │   │   ├── actions.ts
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── page.tsx
│   │   │   ├── api/
│   │   │   │   ├── agents/route.ts
│   │   │   │   ├── automations/route.ts
│   │   │   │   ├── campaigns/route.ts
│   │   │   │   ├── contacts/route.ts
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── twilio/route.ts
│   │   │   │   ├── leads/route.ts
│   │   │   │   ├── notifications/route.ts
│   │   │   │   ├── properties/[propertyId]/contacts/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   ├── sequences/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/route.ts
│   │   │   │   │   ├── [id]/steps/route.ts
│   │   │   │   │   ├── [id]/steps/[stepId]/route.ts
│   │   │   │   │   └── [id]/enroll/route.ts
│   │   │   │   ├── settings/route.ts
│   │   │   │   ├── telemetry/
│   │   │   │   │   ├── ingestion/route.ts
│   │   │   │   │   ├── ingestion/[id]/route.ts
│   │   │   │   │   └── webhooks/route.ts
│   │   │   │   └── webhooks/
│   │   │   │       ├── eztexting/route.ts
│   │   │   │       └── twilio/
│   │   │   │           ├── route.ts
│   │   │   │           └── voice/route.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── agents/page.tsx
│   │   │   │   │   ├── automations/page.tsx
│   │   │   │   │   ├── campaigns/page.tsx
│   │   │   │   │   └── integrations/page.tsx
│   │   │   │   ├── campaigns/page.tsx
│   │   │   │   ├── chat/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [id]/page.tsx
│   │   │   │   │   └── [id]/loading.tsx
│   │   │   │   ├── inbox/page.tsx
│   │   │   │   ├── intelligence/page.tsx
│   │   │   │   ├── queue/page.tsx
│   │   │   │   └── reports/page.tsx
│   │   │   ├── sequences/page.tsx
│   │   │   └── sequences/[id]/page.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── db.ts
│   │   │   ├── integrations.ts
│   │   │   ├── mocks.ts
│   │   │   ├── navigation.ts
│   │   │   ├── phone-utils.ts
│   │   │   ├── propertyUtils.ts
│   │   │   ├── scoring.ts
│   │   │   ├── theme.ts
│   │   │   ├── twilio.ts
│   │   │   └── utils.ts
│   │   ├── prisma/schema.prisma
│   │   └── scripts/
│   │       ├── backfill-contact-property.ts
│   │       ├── build-phone-flags.ts
│   │       ├── consolidate-csvs.ts
│   │       ├── extract-contacts-from-raw.ts
│   │       ├── extract-owners-from-raw.ts
│   │       ├── filter-asset-class.ts
│   │       ├── identify-portfolios.ts
│   │       ├── ingest-dealmachine.ts
│   │       └── score-existing-contacts.ts
│   └── backend/ (separate Prisma/backend code)
└── (root data files) MASTER_CONTACTS.csv, CSVs, docs, etc.
```

Notes:
- Use `lib/db.ts` to get Prisma: `import { prisma } from '@/lib/db'`.
- Utility imports: `normalizePhone` from `lib/phone-utils`, `scoreContact` from `lib/scoring`, `sendSMS` from `lib/twilio`.
- Scripts run from `frontend`: `TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' npx ts-node scripts/<name>.ts`.
