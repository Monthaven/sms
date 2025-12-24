/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { z } from "zod";

export const queueFiltersSchema = z.object({
  priority: z.enum(["HIGH", "MEDIUM", "LOW", "ALL"]).default("ALL"),
  sort: z.enum(["score", "callback", "recent"]).default("score"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const claimLeadSchema = z.object({
  leadId: z.string().cuid(),
});

export const initiateCallSchema = z.object({
  leadId: z.string().cuid().optional(),
  to: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
  source: z.enum(["queue", "manual"]).default("queue"),
}).refine(
  (data) => data.leadId || data.to,
  { message: "Either leadId or 'to' number is required" }
);

export const dispositionSchema = z.object({
  outcome: z.enum([
    "NO_ANSWER",
    "LEFT_VOICEMAIL",
    "NOT_INTERESTED",
    "CALLBACK_REQUESTED",
    "HOT_LEAD",
    "WRONG_NUMBER",
  ]),
  notes: z.string().min(5),
  callbackAt: z.string().datetime().optional(),
  callId: z.string().optional(), // Link to specific call record
});
