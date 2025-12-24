/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { logger } from "@/lib/logger";

/**
 * Retry utility with exponential backoff for external API calls
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: any) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  isRetryable: (error: any) => {
    // Retry on network errors and 5xx status codes
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") return true;
    if (error?.code === "ENOTFOUND") return false; // DNS failure, don't retry
    
    const status = error?.status || error?.statusCode;
    if (status >= 500 && status < 600) return true;
    if (status === 429) return true; // Rate limited, retry with backoff
    
    return false;
  },
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const opts: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const isRetryable = opts.isRetryable?.(error) ?? true;
      const hasMoreAttempts = attempt < opts.maxRetries;

      if (!isRetryable || !hasMoreAttempts) {
        throw error;
      }

      logger.warn(
        `Retry attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying...`,
        { 
          error: error?.message || String(error), 
          delayMs: delay,
          attempt: attempt + 1,
          maxRetries: opts.maxRetries + 1
        }
      );

      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Retry configurations for different services
 */
export const RETRY_CONFIGS = {
  // Twilio - fast retries, network errors only
  TWILIO: {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },
  
  // EzTexting - slower, account for rate limits
  EZTEXTING: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  
  // Database operations - quick retries for transient failures
  DATABASE: {
    maxRetries: 2,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    isRetryable: (error: any) => {
      // Retry on connection issues, deadlocks
      const message = error?.message?.toLowerCase() || "";
      return (
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("deadlock")
      );
    },
  },
} as const;
