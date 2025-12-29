/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

/**
 * Twilio webhook payload parsers
 */

// Voice webhook types
export interface VoiceWebhookData {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ApiVersion: string;
  CallerName?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
  Caller?: string;
  Called?: string;
  DialCallSid?: string;
  DialCallStatus?: string;
  DialCallDuration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  RecordingDuration?: string;
  TranscriptionText?: string;
  TranscriptionStatus?: string;
  TranscriptionSid?: string;
  AnsweredBy?: string;
  MachineDetectionDuration?: string;
  ParentCallSid?: string;
}

// SMS webhook types
export interface SmsWebhookData {
  MessageSid: string;
  SmsSid?: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  NumSegments?: string;
  SmsStatus?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  MediaUrl1?: string;
  MediaContentType1?: string;
  MediaUrl2?: string;
  MediaContentType2?: string;
}

// Status callback types
export interface StatusWebhookData {
  MessageSid?: string;
  CallSid?: string;
  AccountSid: string;
  MessageStatus?: string;
  CallStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  To: string;
  From: string;
  Timestamp?: string;
  CallDuration?: string;
  SequenceNumber?: string;
}

/**
 * Parse URL-encoded form data from request body
 */
export async function parseFormData(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  if (contentType.includes("application/json")) {
    return await req.json();
  }
  
  // Try form data
  try {
    const formData = await req.formData();
    const result: Record<string, string> = {};
    formData.forEach((value, key) => {
      result[key] = value.toString();
    });
    return result;
  } catch {
    return {};
  }
}

/**
 * Parse voice webhook data
 */
export function parseVoiceWebhook(data: Record<string, string>): VoiceWebhookData {
  return {
    CallSid: data.CallSid || "",
    AccountSid: data.AccountSid || "",
    From: data.From || "",
    To: data.To || "",
    CallStatus: data.CallStatus || "",
    Direction: data.Direction || "",
    ApiVersion: data.ApiVersion || "",
    CallerName: data.CallerName,
    FromCity: data.FromCity,
    FromState: data.FromState,
    FromZip: data.FromZip,
    FromCountry: data.FromCountry,
    ToCity: data.ToCity,
    ToState: data.ToState,
    ToZip: data.ToZip,
    ToCountry: data.ToCountry,
    Caller: data.Caller,
    Called: data.Called,
    DialCallSid: data.DialCallSid,
    DialCallStatus: data.DialCallStatus,
    DialCallDuration: data.DialCallDuration,
    RecordingUrl: data.RecordingUrl,
    RecordingSid: data.RecordingSid,
    RecordingDuration: data.RecordingDuration,
    TranscriptionText: data.TranscriptionText,
    TranscriptionStatus: data.TranscriptionStatus,
    TranscriptionSid: data.TranscriptionSid,
    AnsweredBy: data.AnsweredBy,
    MachineDetectionDuration: data.MachineDetectionDuration,
    ParentCallSid: data.ParentCallSid,
  };
}

/**
 * Parse SMS webhook data
 */
export function parseSmsWebhook(data: Record<string, string>): SmsWebhookData {
  return {
    MessageSid: data.MessageSid || data.SmsSid || "",
    SmsSid: data.SmsSid,
    AccountSid: data.AccountSid || "",
    MessagingServiceSid: data.MessagingServiceSid,
    From: data.From || "",
    To: data.To || "",
    Body: data.Body || "",
    NumMedia: data.NumMedia,
    NumSegments: data.NumSegments,
    SmsStatus: data.SmsStatus,
    FromCity: data.FromCity,
    FromState: data.FromState,
    FromZip: data.FromZip,
    FromCountry: data.FromCountry,
    ToCity: data.ToCity,
    ToState: data.ToState,
    ToZip: data.ToZip,
    ToCountry: data.ToCountry,
    MediaUrl0: data.MediaUrl0,
    MediaContentType0: data.MediaContentType0,
    MediaUrl1: data.MediaUrl1,
    MediaContentType1: data.MediaContentType1,
    MediaUrl2: data.MediaUrl2,
    MediaContentType2: data.MediaContentType2,
  };
}

/**
 * Parse status callback data
 */
export function parseStatusWebhook(data: Record<string, string>): StatusWebhookData {
  return {
    MessageSid: data.MessageSid,
    CallSid: data.CallSid,
    AccountSid: data.AccountSid || "",
    MessageStatus: data.MessageStatus,
    CallStatus: data.CallStatus,
    ErrorCode: data.ErrorCode,
    ErrorMessage: data.ErrorMessage,
    To: data.To || "",
    From: data.From || "",
    Timestamp: data.Timestamp,
    CallDuration: data.CallDuration,
    SequenceNumber: data.SequenceNumber,
  };
}

/**
 * Extract media URLs from SMS webhook
 */
export function extractMediaUrls(data: SmsWebhookData): string[] {
  const urls: string[] = [];
  const numMedia = parseInt(data.NumMedia || "0", 10);
  
  for (let i = 0; i < numMedia; i++) {
    const key = `MediaUrl${i}` as keyof SmsWebhookData;
    const url = data[key] as string | undefined;
    if (url) {
      urls.push(url);
    }
  }
  
  return urls;
}
