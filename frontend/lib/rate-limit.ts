/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Hybrid Rate Limiter for Next.js API routes
 * - Uses Vercel KV REST API when available for production multi-instance support
 * - Falls back to in-memory store for development/single instance
 * 
 * To enable Vercel KV in production:
 * 1. Add a KV store to your Vercel project
 * 2. Set KV_REST_API_URL and KV_REST_API_TOKEN env vars
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// ============================================================================
// In-Memory Store (Development / Fallback)
// ============================================================================

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `ratelimit:${identifier}`;

  let entry = memoryStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment
  entry.count += 1;
  memoryStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

// ============================================================================
// Vercel KV REST API (Production / Multi-Instance)
// ============================================================================

// Support Vercel KV naming or Upstash Redis REST naming
const KV_API_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL; // REDIS_URL only works if it's the Upstash REST URL
const KV_API_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;
const kvEnabled = !!(KV_API_URL && KV_API_TOKEN);

/**
 * Make a REST API call to Vercel KV
 */
async function kvRequest(
  command: string[]
): Promise<{ result: unknown } | null> {
  if (!KV_API_URL || !KV_API_TOKEN) return null;

  try {
    const response = await fetch(`${KV_API_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`KV request failed: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    logger.warn("Vercel KV request failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function checkRateLimitKV(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  try {
    // Increment the counter
    const incrResult = await kvRequest(["INCR", key]);
    if (!incrResult) {
      return checkRateLimitMemory(identifier, config);
    }

    const count = incrResult.result as number;

    // If this is the first request, set expiration
    if (count === 1) {
      await kvRequest(["PEXPIRE", key, String(windowMs)]);
    }

    // Get TTL to calculate reset time
    const ttlResult = await kvRequest(["PTTL", key]);
    const ttl = (ttlResult?.result as number) || windowMs;

    const resetAt = ttl > 0 ? now + ttl : now + windowMs;
    const remaining = Math.max(0, config.limit - count);
    const success = count <= config.limit;

    return {
      success,
      limit: config.limit,
      remaining,
      resetAt,
    };
  } catch (err) {
    logger.error("Vercel KV rate limit error, falling back to memory", {
      error: err instanceof Error ? err.message : String(err),
    });
    return checkRateLimitMemory(identifier, config);
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Check rate limit for a given identifier (usually IP or user ID)
 * Automatically uses Vercel KV in production, falls back to in-memory
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (kvEnabled) {
    return checkRateLimitKV(identifier, config);
  }
  return checkRateLimitMemory(identifier, config);
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use this for middleware where async is not possible
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitMemory(identifier, config);
}

/**
 * Legacy compatibility export
 * @deprecated Use checkRateLimitAsync instead (async)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return checkRateLimitAsync(identifier, config);
}

// ============================================================================
// Preset Configurations
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  /** Standard API: 100 requests per minute */
  api: { limit: 100, windowSeconds: 60 },
  
  /** Strict API: 30 requests per minute */
  apiStrict: { limit: 30, windowSeconds: 60 },
  
  /** Authentication: 5 attempts per 15 minutes */
  auth: { limit: 5, windowSeconds: 900 },
  
  /** SMS sending: 10 messages per minute */
  sms: { limit: 10, windowSeconds: 60 },
  
  /** Webhooks: 1000 requests per minute */
  webhook: { limit: 1000, windowSeconds: 60 },
  
  /** AI/LLM requests: 20 per minute */
  ai: { limit: 20, windowSeconds: 60 },
  
  // Legacy aliases for backward compatibility
  /** @deprecated Use 'api' instead */
  API_GENERAL: { limit: 100, windowSeconds: 60 },
  /** @deprecated Use 'sms' instead */
  SMS_SEND: { limit: 10, windowSeconds: 60 },
  /** @deprecated Use 'auth' instead */
  TOKEN_GEN: { limit: 20, windowSeconds: 60 },
} as const;

/**
 * Legacy alias for RATE_LIMIT_PRESETS
 * @deprecated Use RATE_LIMIT_PRESETS instead
 */
export const RATE_LIMITS = RATE_LIMIT_PRESETS;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get rate limit headers for API responses
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

/**
 * Create a rate-limited response (429 Too Many Requests)
 */
export function rateLimitedResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(result),
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  );
}

/**
 * Extract client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  return realIp || "unknown";
}

/**
 * Legacy alias for getClientIdentifier
 * @deprecated Use getClientIdentifier instead
 */
export const getClientIP = getClientIdentifier;

/**
 * Legacy alias for getRateLimitHeaders
 * @deprecated Use getRateLimitHeaders instead
 */
export const rateLimitHeaders = getRateLimitHeaders;

// Log KV status on module load
if (kvEnabled) {
  logger.info("Rate limiter: Vercel KV enabled");
} else {
  logger.debug("Rate limiter: Using in-memory store (set KV_REST_API_URL and KV_REST_API_TOKEN for production)");
}
