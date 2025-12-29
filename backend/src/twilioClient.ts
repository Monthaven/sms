/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Twilio Client - Voice calls and SMS messaging
 */

import { env } from './env';
import { logger } from './logger';
import twilio from 'twilio';

const log = logger.child({ service: 'TwilioClient' });

// ============================================================================
// Twilio Client Initialization
// ============================================================================

const hasTwilio = !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_MAIN_FROM;

export const twilioClient = hasTwilio
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

if (hasTwilio) {
  log.info('Twilio client initialized', { from: env.TWILIO_MAIN_FROM });
} else {
  log.warn('Twilio credentials missing - SMS/Voice disabled');
}

// ============================================================================
// Retry Configuration
// ============================================================================

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      const code = error.code || error.status;
      if (code && code >= 20000 && code < 30000) {
        // Twilio error codes 20xxx are client errors
        log.error(`${operationName} failed with client error`, { code, attempt });
        throw error;
      }

      if (attempt < config.maxRetries) {
        log.warn(`${operationName} failed, retrying`, { 
          attempt, 
          maxRetries: config.maxRetries, 
          delayMs: delay,
          error: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= config.backoffMultiplier;
      }
    }
  }

  log.error(`${operationName} failed after all retries`, { 
    maxRetries: config.maxRetries,
    error: lastError?.message 
  });
  throw lastError;
}

// ============================================================================
// SMS Functions
// ============================================================================

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
  mediaUrl?: string[];
  scheduledAt?: Date;
}

export interface SendSmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
  price?: string;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Send an SMS message via Twilio.
 * Supports retry logic, MMS media, and scheduled messages.
 */
export async function sendTwilioSMS(options: SendSmsOptions): Promise<SendSmsResult> {
  if (!twilioClient || !env.TWILIO_MAIN_FROM) {
    throw new Error('Twilio not configured - missing credentials');
  }

  const from = options.from || env.TWILIO_MAIN_FROM;
  const to = formatPhoneNumber(options.to);

  log.debug('Sending SMS', { to, from: from.slice(-4), bodyLength: options.body.length });

  const message = await withRetry(
    async () => {
      const params: any = {
        to,
        from,
        body: options.body,
      };

      if (options.statusCallback) {
        params.statusCallback = options.statusCallback;
      }

      if (options.mediaUrl && options.mediaUrl.length > 0) {
        params.mediaUrl = options.mediaUrl;
      }

      // Scheduled messages require MessagingServiceSid
      if (options.scheduledAt && env.TWILIO_MESSAGING_SERVICE_SID) {
        params.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
        params.sendAt = options.scheduledAt.toISOString();
        params.scheduleType = 'fixed';
        delete params.from; // Can't use 'from' with scheduled messages
      }

      return await twilioClient!.messages.create(params);
    },
    DEFAULT_RETRY_CONFIG,
    'sendTwilioSMS'
  );

  log.info('SMS sent successfully', { 
    sid: message.sid, 
    to, 
    status: message.status 
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
    body: message.body,
    dateCreated: message.dateCreated,
    price: message.price ?? undefined,
    errorCode: message.errorCode ?? undefined,
    errorMessage: message.errorMessage ?? undefined,
  };
}

/**
 * Send SMS from the office number (convenience wrapper)
 */
export async function sendOfficeSms(to: string, body: string): Promise<string> {
  const result = await sendTwilioSMS({ to, body });
  return result.sid;
}

/**
 * Send bulk SMS messages (with rate limiting)
 */
export async function sendBulkSms(
  messages: SendSmsOptions[],
  rateLimit: number = 10 // messages per second
): Promise<{ success: SendSmsResult[]; failed: Array<{ options: SendSmsOptions; error: string }> }> {
  const success: SendSmsResult[] = [];
  const failed: Array<{ options: SendSmsOptions; error: string }> = [];
  const delayMs = 1000 / rateLimit;

  log.info('Starting bulk SMS', { count: messages.length, rateLimit });

  for (let i = 0; i < messages.length; i++) {
    try {
      const result = await sendTwilioSMS(messages[i]);
      success.push(result);
    } catch (error: any) {
      failed.push({ options: messages[i], error: error.message });
      log.warn('Bulk SMS item failed', { 
        index: i, 
        to: messages[i].to, 
        error: error.message 
      });
    }

    // Rate limiting delay (skip on last item)
    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  log.info('Bulk SMS completed', { 
    total: messages.length, 
    success: success.length, 
    failed: failed.length 
  });

  return { success, failed };
}

/**
 * Get SMS message status by SID
 */
export async function getSmsStatus(sid: string): Promise<SendSmsResult | null> {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  try {
    const message = await twilioClient.messages(sid).fetch();
    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      price: message.price ?? undefined,
      errorCode: message.errorCode ?? undefined,
      errorMessage: message.errorMessage ?? undefined,
    };
  } catch (error: any) {
    log.warn('Failed to fetch SMS status', { sid, error: error.message });
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format phone number to E.164 format for Twilio
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's a US number (10 digits), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code (11+ digits), ensure + prefix
  if (digits.length >= 11) {
    return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  }

  // Return as-is with + if short (might be shortcode)
  return phone.startsWith('+') ? phone : `+${digits}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Check if Twilio is configured and ready
 */
export function isTwilioConfigured(): boolean {
  return hasTwilio;
}
