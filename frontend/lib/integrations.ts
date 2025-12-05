export type TwilioStatus = {
  status: "connected" | "pending" | "missing";
  missingEnv: string[];
  webhookUrl: string;
  instructions: string;
};

const TWILIO_ENV_VARS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];

export function evaluateTwilioStatus(): TwilioStatus {
  const missingEnv = TWILIO_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  let status: TwilioStatus["status"] = "connected";
  if (missingEnv.length === TWILIO_ENV_VARS.length) {
    status = "missing";
  } else if (missingEnv.length > 0) {
    status = "pending";
  }

  const webhookUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.concat("/api/webhooks/twilio") ??
    "https://your-project.vercel.app/api/webhooks/twilio";

  return {
    status,
    missingEnv,
    webhookUrl,
    instructions:
      "Set env vars (Account SID, Auth Token, From Number) in both Vercel (Storefront) and local .env (Engine). After redeploy, Twilio status will refresh automatically.",
  };
}

export async function fetchTwilioStatus(): Promise<TwilioStatus> {
  const res = await fetch("/api/integrations/twilio");
  if (!res.ok) throw new Error("Unable to load Twilio status");
  return res.json();
}
