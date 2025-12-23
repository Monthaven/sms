/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * PII masking utilities for caller role.
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "xxx-xxx-xxxx";
  const last4 = digits.slice(-4);
  return `xxx-xxx-${last4}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "xxxxx@unknown.com";
  const maskedLocal = `${local.charAt(0)}xxxxx`;
  return `${maskedLocal}@${domain}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const first = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1].charAt(0)}.` : "";
  return `${first} ${lastInitial}`.trim();
}

export interface MaskableContact {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export function maskContact<T extends MaskableContact>(contact: T, shouldMask: boolean): T {
  if (!shouldMask) return contact;
  return {
    ...contact,
    name: maskName(contact.name),
    phone: maskPhone(contact.phone),
    email: maskEmail(contact.email),
  };
}

export function shouldMaskForRole(role: string): boolean {
  return role === "CALLER";
}
