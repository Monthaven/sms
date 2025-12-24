/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { logger } from "@/lib/logger";

/**
 * Password hashing utilities using Web Crypto API
 * This is compatible with Edge Runtime and serverless environments
 */

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const ALGORITHM = "PBKDF2";
const HASH_ALGORITHM = "SHA-256";

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Convert Uint8Array to hex string
 */
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Hash a password using PBKDF2
 * Returns a string in format: salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    ALGORITHM,
    false,
    ["deriveBits"]
  );

  // Derive the hash - use ArrayBuffer directly to avoid type issues
  const saltArrayBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt: saltArrayBuffer,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const hash = new Uint8Array(hashBuffer);
  
  // Return salt:hash format
  return `${bufferToHex(salt)}:${bufferToHex(hash)}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) return false;

    const salt = hexToBuffer(saltHex);
    const storedHashBuffer = hexToBuffer(hashHex);
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      ALGORITHM,
      false,
      ["deriveBits"]
    );

    // Derive the hash - use ArrayBuffer directly to avoid type issues
    const saltArrayBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: ALGORITHM,
        salt: saltArrayBuffer,
        iterations: ITERATIONS,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      KEY_LENGTH * 8
    );

    const computedHash = new Uint8Array(hashBuffer);

    // Constant-time comparison to prevent timing attacks
    if (computedHash.length !== storedHashBuffer.length) return false;
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash[i] ^ storedHashBuffer[i];
    }
    
    return result === 0;
  } catch (error) {
    logger.error("Password verification failed", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Generate a secure random token (for session IDs, reset tokens, etc.)
 */
export function generateSecureToken(length: number = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(length));
  return bufferToHex(buffer);
}

/**
 * Generate a time-limited token with expiry
 * Format: timestamp:token
 */
export function generateTimedToken(expiryMinutes: number = 60): string {
  const expiry = Date.now() + expiryMinutes * 60 * 1000;
  const token = generateSecureToken(24);
  return `${expiry}:${token}`;
}

/**
 * Validate a timed token
 */
export function validateTimedToken(timedToken: string): boolean {
  try {
    const [expiryStr] = timedToken.split(":");
    const expiry = parseInt(expiryStr, 10);
    return !isNaN(expiry) && Date.now() < expiry;
  } catch {
    return false;
  }
}
