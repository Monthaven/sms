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
  leadId: z.string().cuid(),
});

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
});
