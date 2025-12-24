/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { z } from "zod";

/**
 * Common validation schemas for API inputs
 */

// Phone number validation (E.164 format)
export const phoneE164Schema = z
  .string()
  .regex(/^\+1\d{10}$/, "Phone must be in E.164 format (+1XXXXXXXXXX)")
  .or(z.string().regex(/^\d{10}$/, "Phone must be 10 digits").transform((p) => `+1${p}`));

// Email validation
export const emailSchema = z.string().email("Invalid email address").toLowerCase();

// UUID/CUID validation
export const idSchema = z.string().min(1, "ID is required");

// SMS message validation
export const smsMessageSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(1600, "Message too long (max 1600 characters)"); // SMS can be up to 1600 chars (10 segments)

// Provider validation
export const smsProviderSchema = z.enum(["twilio", "eztexting"]);

// Lead status validation
export const leadStatusSchema = z.enum([
  "NEW",
  "QUEUED_FOR_CALL",
  "QUEUED",
  "SENT",
  "RESP_STOP",
  "RESP_BOUNCE",
  "RESP_COLD",
  "RESP_WARM",
  "RESP_HOT",
  "CONVERSATION_ACTIVE",
  "CONVERTED",
  "ARCHIVED",
]);

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: "Start date must be before end date" }
);

/**
 * API Request Schemas
 */

// SMS Send request
export const smsSendRequestSchema = z.object({
  to: phoneE164Schema,
  message: smsMessageSchema,
  provider: smsProviderSchema.optional().default("twilio"),
  leadId: idSchema.optional(),
});

// Lead update request
export const leadUpdateRequestSchema = z.object({
  status: leadStatusSchema.optional(),
  notes: z.string().max(5000).optional(),
  assignedToId: idSchema.nullable().optional(),
  isFlagged: z.boolean().optional(),
});

// Contact create/update request
export const contactRequestSchema = z.object({
  phoneE164: phoneE164Schema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: emailSchema.optional(),
  source: z.string().max(50).optional(),
});

// Campaign create request
export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  message: smsMessageSchema.optional(),
});

// Sequence create request
export const sequenceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

// Sequence step create request
export const sequenceStepSchema = z.object({
  name: z.string().min(1).max(200),
  template: smsMessageSchema,
  delayDays: z.number().int().min(0).max(365).default(0),
  stepNumber: z.number().int().min(1),
  skipIfResponded: z.boolean().default(true),
  skipIfOptedOut: z.boolean().default(true),
});

// Search request
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(["contacts", "leads", "properties", "all"]).default("all"),
  ...paginationSchema.shape,
});

// Login request
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  passkey: z.string().optional(),
});

/**
 * Validation helper function for API routes
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return { success: false, error: errors.join("; ") };
  }
  
  return { success: true, data: result.data };
}

/**
 * Type exports for use in API routes
 */
export type SMSSendRequest = z.infer<typeof smsSendRequestSchema>;
export type LeadUpdateRequest = z.infer<typeof leadUpdateRequestSchema>;
export type ContactRequest = z.infer<typeof contactRequestSchema>;
export type CampaignCreateRequest = z.infer<typeof campaignCreateSchema>;
export type SequenceCreateRequest = z.infer<typeof sequenceCreateSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
