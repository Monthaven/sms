/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required('DATABASE_URL'),
  DIRECT_URL: required('DIRECT_URL'),

  // EzTexting (Support multiple auth methods)
  EZTEXTING_API_BASE: optional('EZTEXTING_API_BASE') || 'https://a.eztexting.com/v1',
  EZTEXTING_USER: optional('EZTEXTING_USER'),
  EZTEXTING_PASS: optional('EZTEXTING_PASS'),
  EZTEXTING_API_KEY: optional('EZTEXTING_API_KEY'),

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_MAIN_FROM: process.env.TWILIO_MAIN_FROM ?? ''
};

// Indicate whether EzTexting credentials are present. Do not throw here so
// services that don't require EzTexting (imports, local testing) can still
// start. Campaigns or other code that perform sends should check this flag
// and fail gracefully if disabled.
const hasEzKey = Boolean(env.EZTEXTING_API_KEY && env.EZTEXTING_API_KEY.length > 0);
const hasEzUserPass = Boolean(env.EZTEXTING_USER && env.EZTEXTING_PASS);
export const EZTEXTING_ENABLED = hasEzKey || hasEzUserPass;
