Monthaven Acquisition Engine (MAE)

Status: ACTIVE DEVELOPMENT - PHASE 2
Version: 2.1.0 (Institutional Node.js Platform)

1. Executive Summary

The Monthaven Acquisition Engine is a hybrid automated/manual real estate acquisition platform. It separates high-volume automated outreach from high-touch manual closing.

Ingestion: Mass import of property/owner data (DealMachine CSVs) with Deep Trace logic (multi-contact).

Filtering: Automated SMS blasts and drip campaigns via EzTexting API.

Routing: Intelligent webhooks classify replies (STOP vs. HOT).

Closing: A dedicated Next.js "Command Center" allows humans to engage qualified leads via a separate Twilio Office Line.

2. System Architecture

2.1. The Backend API (Active)

Role: The heavy lifter. Handles CSV parsing, Database state, SMS automation, and Webhooks.

Location: /backend

Tech: Node.js (Express), TypeScript, Prisma ORM.

Database: Neon (Serverless Postgres).

Hosting: Render or Railway (Required for long-running CSV jobs).

2.2. The Command Center (Planned - Phase 5)

Role: The human interface for "Closer" agents.

Location: /frontend (Next.js)

Tech: Next.js (App Router), Tailwind CSS.

Hosting: Vercel.

3. Database Schema (Source of Truth)

Rules:

Postgres Only. No SQLite.

Json for Flexibility. Property table uses rawDetails JSONB to store extra DealMachine columns without migration headaches.

Strict Status Enums. LeadStatus controls the entire lifecycle.

Multi-User: Supports Admins and Agents.

// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// --- USERS & AUTH ---

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole @default(AGENT)
  
  assignedLeads Lead[]
  auditLogs     LeadAudit[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  AGENT
}

// --- CORE ENTITIES ---

model Contact {
  id          String   @id @default(cuid())
  phoneE164   String   @unique // Normalized +1XXXXXXXXXX
  phoneType   String?  // "Mobile", "Landline", "VoIP"
  firstName   String?
  lastName    String?
  email       String?
  source      String   @default("DEALMACHINE")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  properties   Property[]
  leads        Lead[]
  interactions Interaction[]
  
  @@index([phoneE164])
}

model Property {
  id             String   @id @default(cuid())
  ownerId        String?
  owner          Contact? @relation(fields: [ownerId], references: [id])

  addressLine1   String
  city           String
  state          String
  postalCode     String
  
  // Stores raw DealMachine CSV data to prevent data loss
  rawDetails     Json?    

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  leads          Lead[]

  @@unique([addressLine1, city, state])
}

model DncList {
  id        String   @id @default(cuid())
  phoneE164 String   @unique
  reason    String?  // "STOP keyword", "Manual", "Litigator"
  createdAt DateTime @default(now())
}

// --- PIPELINE STATE ---

model Campaign {
  id               String   @id @default(cuid())
  name             String
  ezTextingGroupId String? // External Group ID
  status           String   @default("DRAFT") 

  createdAt        DateTime @default(now())
  leads            Lead[]
}

model Lead {
  id             String      @id @default(cuid())
  campaignId     String
  campaign       Campaign    @relation(fields: [campaignId], references: [id])
  
  contactId      String
  contact        Contact     @relation(fields: [contactId], references: [id])
  
  propertyId     String?
  property       Property?   @relation(fields: [propertyId], references: [id])

  status         LeadStatus  @default(NEW)
  sentimentScore Int         @default(0) // -100 to 100
  
  // Agent Workflow
  assignedToId   String?
  assignedTo     User?       @relation(fields: [assignedToId], references: [id])
  isFlagged      Boolean     @default(false)
  notes          String?     @db.Text

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  audits         LeadAudit[]

  @@unique([campaignId, contactId, propertyId])
  @@index([status])
  @@index([assignedToId])
}

model LeadAudit {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id])
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String   
  details   String?  
  createdAt DateTime @default(now())
}

model Interaction {
  id          String   @id @default(cuid())
  contactId   String
  contact     Contact  @relation(fields: [contactId], references: [id])

  channel     Channel  
  direction   Direction
  
  body        String   @db.Text
  externalId  String?  
  
  createdAt   DateTime @default(now())
  
  @@index([contactId])
}

// --- ENUMS ---

enum LeadStatus {
  NEW             // Mobile: Ready for Blast
  QUEUED_FOR_CALL // Landline: Manual Call Queue
  QUEUED          // Waiting
  SENT            // Blast Sent
  RESP_STOP       // Auto-DNC
  RESP_BOUNCE     // Failed
  RESP_COLD       // "Not interested"
  RESP_WARM       // "Who is this?"
  RESP_HOT        // "Price?"
  CONVERSATION_ACTIVE // Human took over
  CONVERTED       // Contract/Appt
  ARCHIVED        // Dead
}

enum Channel {
  EZTEXTING
  TWILIO
}

enum Direction {
  INBOUND
  OUTBOUND
}


4. Implementation Master Plan

Phase 1: Foundation (Backend) ✅

[x] Repo Cleanse: Removed legacy Google Apps Scripts, SQLite files, and 50+ loose CSVs.

[x] Schema Definition: Institutional Prisma schema defined.

[x] Stubbing: Fixed API route errors to allow server boot.

[x] Cleanup: Removed node_modules and re-installed cleanly.

Phase 2: Data Ingestion (The Pipeline) ✅

[x] Connect DB: Update .env with Neon credentials and run npx prisma db push.

[x] Service: ImportService

Implement stream-based CSV parsing (Deep Trace Logic).

Upsert Logic: Handle duplicate contacts and properties.

Deep Trace: Iterate 20 contact columns.

Routing: Mobile -> NEW, Landline -> QUEUED_FOR_CALL.

Phase 3: The "Blast" Engine (EzTexting) ✅

[x] Client: EzTextingClient updated for API v1 (Basic Auth).

[x] Service: CampaignService

launchBlast(name, message) logic implemented.

Updates Lead status to SENT.

Phase 4: The "Brain" (Inbound Routing) ✅

[x] Webhook: POST /webhooks/eztexting

Classifies replies (STOP/HOT/WARM).

Updates Lead Status.

Logs to Interaction table.

[x] Webhook: POST /webhooks/twilio

Logs manual conversations.

Phase 5: The Command Center (Frontend) ⏳

[ ] Setup: Initialize Next.js project (npx create-next-app).

[ ] API Client: Typed fetch wrapper to talk to the Backend.

[ ] View (Inbox): Table showing leads where status is HOT/WARM.

[ ] Action (Chat): Interface to send 1:1 texts via Twilio Office Line.

[ ] View (Call Queue): List of Landlines for manual calling.

5. Environment Variables (Required)

Create backend/.env (do not commit to Git):

# Data (Neon)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations

# EzTexting (Blast - Basic Auth)
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
EZTEXTING_API_BASE="[https://a.eztexting.com/v1](https://a.eztexting.com/v1)"

# Twilio (Office)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+1..."

# Security
API_SECRET="..." # For internal API protection
