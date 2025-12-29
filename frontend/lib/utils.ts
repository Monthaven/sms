/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for conditionally joining classNames with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}
