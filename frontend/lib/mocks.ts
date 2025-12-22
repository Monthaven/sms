/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

export const mockCampaigns = [
  {
    id: "CAMP_NOV_A",
    name: "November Warm Follow-up",
    status: "Scheduled",
    channel: "EzTexting",
    messages: 10241,
    eta: "2025-11-05 09:00",
    owner: "Alex Rivera",
  },
  {
    id: "CAMP_Q4_B",
    name: "Q4 Landline Revival",
    status: "Running",
    channel: "Twilio",
    messages: 6521,
    eta: "In progress",
    owner: "Morgan Lee",
  },
  {
    id: "CAMP_SMOKE",
    name: "Smoke Test / Engine",
    status: "Draft",
    channel: "Local CLI",
    messages: 42,
    eta: "Manual launch",
    owner: "CLI",
  },
];

export const mockAgents = [
  { id: "1", name: "Alex Rivera", role: "Senior Closer", status: "online", leads: 8 },
  { id: "2", name: "Morgan Lee", role: "Caller", status: "online", leads: 5 },
  { id: "3", name: "Jordan Pace", role: "SMS Specialist", status: "away", leads: 3 },
  { id: "4", name: "Avery Chen", role: "Runner", status: "offline", leads: 0 },
  { id: "5", name: "Taylor Brooks", role: "Analyst", status: "online", leads: 2 },
];

export const mockAutomations = [
  {
    id: "auto-1",
    name: "Nightly Lead Sync",
    cadence: "0 1 * * *",
    owner: "Engine",
    status: "healthy",
    lastRun: "01:00",
  },
  {
    id: "auto-2",
    name: "Webhook Watchdog",
    cadence: "*/5 * * * *",
    owner: "Storefront",
    status: "warning",
    lastRun: "00:05",
  },
  {
    id: "auto-3",
    name: "Campaign QA Ping",
    cadence: "0 9 * * 1-5",
    owner: "Operations",
    status: "paused",
    lastRun: "Pending",
  },
];

export const mockIntegrations = [
  {
    id: "eztexting",
    name: "EzTexting",
    status: "connected",
    lastEvent: "Inbound text · 2m ago",
  },
  {
    id: "twilio",
    name: "Twilio",
    status: "disconnected",
    lastEvent: "Not connected",
  },
  {
    id: "webhook",
    name: "Webhook Relay",
    status: "connected",
    lastEvent: "POST /api/webhooks/eztexting",
  },
];

export const mockLeads = [
  {
    id: "lead_001",
    status: "RESP_HOT",
    contact: {
      firstName: "Elena",
      lastName: "West",
      phoneE164: "+16155551234",
    },
    property: {
      addressLine1: "412 Monthaven Park",
      city: "Nashville",
      state: "TN",
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead_002",
    status: "RESP_WARM",
    contact: {
      firstName: "Marcus",
      lastName: "Grant",
      phoneE164: "+16155554545",
    },
    property: {
      addressLine1: "908 Twelve Oaks Dr",
      city: "Franklin",
      state: "TN",
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead_003",
    status: "CONVERSATION_ACTIVE",
    contact: {
      firstName: "Corrine",
      lastName: "Lopez",
      phoneE164: "+16155550009",
    },
    property: {
      addressLine1: "122 Woodland View",
      city: "Brentwood",
      state: "TN",
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead_004",
    status: "SENT",
    contact: {
      firstName: "Jared",
      lastName: "Nielsen",
      phoneE164: "+16155557770",
    },
    property: {
      addressLine1: "55 Mason Trail",
      city: "Hendersonville",
      state: "TN",
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead_005",
    status: "QUEUED_FOR_CALL",
    contact: {
      firstName: "Anita",
      lastName: "Barnes",
      phoneE164: "+16155558888",
    },
    property: {
      addressLine1: "87 Crestmont Ct",
      city: "Gallatin",
      state: "TN",
    },
    updatedAt: new Date().toISOString(),
  },
];
