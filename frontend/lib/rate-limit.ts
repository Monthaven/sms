/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * In-memory rate limiter for Next.js API routes
 * For production at scale, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

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

/**
 * Check rate limit for a given identifier (usually IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // Reset if window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from Next.js request
 */
export function getClientIP(request: Request): string {
  // Check various headers for proxied requests
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a generic identifier
  return "unknown";
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // SMS sending - 10 per minute per IP
  SMS_SEND: { limit: 10, windowSeconds: 60 },
  
  // Token generation - 5 per minute per IP
  TOKEN_GEN: { limit: 5, windowSeconds: 60 },
  
  // API general - 100 per minute per IP
  API_GENERAL: { limit: 100, windowSeconds: 60 },
  
  // Login attempts - 5 per minute per IP
  LOGIN: { limit: 5, windowSeconds: 60 },
  
  // Webhook processing - 1000 per minute (high volume expected)
  WEBHOOK: { limit: 1000, windowSeconds: 60 },
} as const;

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}
