/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * GET /api/sms/integration-status
 * Check if Twilio/EzTexting integrations are configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const rateLimitResult = checkRateLimit(`integration-status:${clientIp}`, { limit: 30, windowSeconds: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: { 
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetAt)
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (!provider || !['twilio', 'eztexting'].includes(provider)) {
    return NextResponse.json(
      { error: 'Invalid provider. Must be "twilio" or "eztexting"' },
      { status: 400 }
    );
  }

  // Check configuration based on provider
  if (provider === 'twilio') {
    const configured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    return NextResponse.json({
      provider: 'twilio',
      configured,
      webhookUrl: '/api/sms/webhooks/twilio',
      features: {
        voice: Boolean(process.env.TWILIO_PHONE_NUMBER),
        sms: Boolean(process.env.TWILIO_PHONE_NUMBER),
        signatureValidation: Boolean(process.env.TWILIO_AUTH_TOKEN),
      },
      // Don't expose actual credentials, just show if they're set
      credentials: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing',
        authToken: process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Missing',
      },
    });
  }

  if (provider === 'eztexting') {
    const configured = Boolean(
      process.env.EZTEXTING_USER &&
      process.env.EZTEXTING_PASSWORD
    );

    return NextResponse.json({
      provider: 'eztexting',
      configured,
      webhookUrl: '/api/sms/webhooks/eztexting',
      features: {
        bulkSms: configured,
        mms: configured,
        deliveryReports: configured,
      },
      credentials: {
        user: process.env.EZTEXTING_USER ? '✓ Set' : '✗ Missing',
        password: process.env.EZTEXTING_PASSWORD ? '✓ Set' : '✗ Missing',
      },
    });
  }

  return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
}
