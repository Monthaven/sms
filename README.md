Monthaven Acquisition Engine (MAE)

Status: ACTIVE DEVELOPMENT
Version: 1.0.0 (Institutional)

1. Executive Summary

The Monthaven Acquisition Engine is a hybrid automated/manual real estate acquisition platform. It separates high-volume automated outreach from high-touch manual closing.

Ingestion: Mass import of property/owner data (DealMachine).

Filtering: Automated SMS blasts and drip campaigns via EzTexting.

Routing: Intelligent webhooks classify replies (STOP vs. HOT).

Closing: A dedicated "Command Center" dashboard allows humans to engage qualified leads via a separate Twilio Office Line.

2. Architecture & Tech Stack

The system implements a strict Service-Oriented Architecture to ensure reliability and separation of concerns.

2.1. Backend Service (The Engine)

Role: Data ingest, State management, Webhook processing, SMS Automation.

Stack: Node.js (v18+), Express, TypeScript.

Database: Neon (Serverless Postgres).

ORM: Prisma (Single Source of Truth).

Hosting: Render / Railway (Must support long-running processes for CSV imports).

2.2. Frontend Service (The Command Center)

Role: Human interface for viewing "Hot" leads and 1:1 messaging.

Stack: Next.js (App Router), Tailwind CSS, Lucide Icons.

Hosting: Vercel.

3. Database Schema (Source of Truth)

Strict Rules:

Postgres Only. No SQLite.

No Logic in DB. All logic lives in the Node.js application layer.

Immutable Logs. Interaction table records every event for compliance.

// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// --- ENTITIES ---

model Contact {
  id          String   @id @default(cuid())
  phoneE164   String   @unique // Normalized +1XXXXXXXXXX
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
  ownerId        String
  owner          Contact  @relation(fields: [ownerId], references: [id])

  addressLine1   String
  city           String
  state          String
  postalCode     String
  
  // Stores raw DealMachine CSV data to prevent data loss
  rawDetails     Json?    

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  leads          Lead[]

  @@unique([ownerId, addressLine1, city, state])
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
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@unique([campaignId, contactId, propertyId])
  @@index([status])
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
  NEW             // Imported
  QUEUED          // Ready for EzTexting
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

Phase 1: Foundation (Backend)

[x] Repo Cleanse: Remove SQLite artifacts, schema_local, and dev.db.

[x] Schema Definition: Institutional Prisma schema defined.

[ ] Environment Setup: Configure .env with Neon, EzTexting, and Twilio keys.

[ ] DB Initialization: Run npx prisma db push to sync Neon.

Phase 2: Data Ingestion (The Pipeline)

[ ] Service: ImportService

Stream-read DealMachine CSVs.

Normalization: Convert (555) 123-4567 -> +15551234567.

Upsert Logic: -   Check if Contact exists by phoneE164.

Update Name if missing.

Create Property if not linked to Owner.

Create Lead with status NEW.

Phase 3: The "Blast" Engine (EzTexting)

[ ] Service: CampaignService

createGroup(name): Calls EzTexting API to create a group.

addContacts(groupId, numbers): Batches uploads (100 at a time).

launchBlast(campaignId): Triggers the initial message via API.

State Update: Mark all included Leads as SENT.

Phase 4: The "Brain" (Inbound Routing)

[ ] Webhook: POST /webhooks/eztexting

Input: Phone Number, Message Body.

Logic:

If body contains STOP/REMOVE/UNSUBSCRIBE:

Create DncList entry.

Update Lead Status -> RESP_STOP.

If body contains YES/PRICE/OFFER:

Update Lead Status -> RESP_HOT.

Else:

Update Lead Status -> RESP_WARM (Human Review).

Logging: Save message to Interaction table (Channel: EZTEXTING).

[ ] Webhook: POST /webhooks/twilio

Input: SMS to Office Number.

Logic:

Find Contact.

Log Interaction (Channel: TWILIO).

Update Lead Status -> CONVERSATION_ACTIVE.

Phase 5: The Command Center (Frontend)

[ ] Setup: Initialize Next.js project.

[ ] View: Inbox

Fetch Leads where Status IN (RESP_HOT, RESP_WARM, CONVERSATION_ACTIVE).

Sort by updatedAt desc.

[ ] Feature: Quick Chat

Right-side panel showing Interaction history.

Input box -> Calls Backend /api/chat/send.

Backend uses Twilio SDK to send 1:1 message.

5. API Logic Flows

Sending a Manual Text (Office Line)

Frontend: User types "Hi, are you the owner?" and clicks Send.

API: POST /api/chat/send { contactId, message }.

Backend:

Checks DncList (Safety first!).

Calls twilioClient.messages.create({ from: OFFICE_NUM, to: contact.phone, body }).

Creates Interaction record (Direction: OUTBOUND, Channel: TWILIO).

Result: Message sent, history updated.

Handling an EzTexting Reply

Event: Lead replies "Who is this?" to the automated blast.

EzTexting: Hits POST /webhooks/eztexting.

Backend:

Parses Phone +1....

Finds Lead associated with recent Campaign.

Regex Check: Matches "Who is this?" -> RESP_WARM.

Updates Lead.status = RESP_WARM.

Logs Interaction.

Frontend: Dashboard polls/swrs and shows new "Warm" lead in Inbox.

6. Environment Variables (Required)

# Data
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations

# EzTexting (Blast)
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
EZTEXTING_API_URL="[https://a.eztexting.com/v1](https://a.eztexting.com/v1)"

# Twilio (Office)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+1..."

# Security
API_SECRET="..." # For internal API protection
