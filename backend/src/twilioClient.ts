import { env } from './env';
import twilio from 'twilio';

const hasTwilio = !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_MAIN_FROM;

export const twilioClient = hasTwilio
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendOfficeSms(to: string, body: string): Promise<string> {
  if (!twilioClient || !env.TWILIO_MAIN_FROM) {
    throw new Error('Twilio not configured');
  }
  const msg = await twilioClient.messages.create({
    to,
    from: env.TWILIO_MAIN_FROM,
    body
  });
  return msg.sid;
}
