/**
 * Password utilities using PBKDF2 (Web Crypto) for hashing and verification.
 * Output format: pbkdf2:<iterations>:<saltHex>:<hashHex>
 */

import { webcrypto as nodeCrypto } from "crypto";

const cryptoApi: Crypto = (globalThis.crypto ?? (nodeCrypto as unknown as Crypto));

const PBKDF2_ITERATIONS = 310_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;

function getCrypto(): Crypto {
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return cryptoApi;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const crypto = getCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations,
    },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );

  return new Uint8Array(derivedBits);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const crypto = getCrypto();
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(salt);

  const derived = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(derived)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash?.split(":");
  if (!parts || parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromHex(parts[2]);
  const expected = fromHex(parts[3]);
  const derived = await deriveKey(password, salt, iterations);

  return timingSafeEqual(derived, expected);
}

export function generateSecureToken(byteLength = 32): string {
  const crypto = getCrypto();
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
}
