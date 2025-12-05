"use client";

import PageFooterRail from "@/components/PageFooterRail";
import { useIntegrations } from "@/lib/hooks/useIntegrations";
import { useTwilioStatus } from "@/lib/hooks/useIntegrationStatus";
import type { TwilioStatus } from "@/lib/integrations";
import { Activity, AlertTriangle, Link2, PlugZap, RefreshCcw, ShieldCheck, Radio } from "lucide-react";
import Link from "next/link";

const statusColor: Record<string, string> = {
  connected: "text-emerald-300",
  disconnected: "text-rose-300",
  pending: "text-amber-300",
};

export default function IntegrationsPage() {
  const { data, isLoading, error } = useIntegrations();
  const { data: twilioStatus, isLoading: twilioLoading, error: twilioError } = useTwilioStatus();

  return (
    <div className="space-y-8 text-slate-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Channels</p>
          <h1 className="text-3xl font-semibold text-white">Integrations</h1>
          <p className="text-sm text-slate-400">
            EzTexting + Twilio + custom webhooks keep the Storefront synced with the Engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button className="mae-button primary text-xs">
            <PlugZap className="h-4 w-4" />
            Connect channel
          </button>
          <button className="mae-button ghost text-xs">
            <RefreshCcw className="h-4 w-4" />
            Refresh status
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-200">Unable to load integrations. {error.message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, idx) => (
            <article key={idx} className="glass-panel border border-white/10 p-5">
              <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/5" />
              <div className="mt-4 h-8 w-full animate-pulse rounded bg-white/5" />
            </article>
          ))}
        {!isLoading &&
          data?.map((integration) => (
            <article key={integration.id} className="glass-panel border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{integration.name}</h3>
                <span
                  className={`text-xs uppercase tracking-[0.3em] ${
                    statusColor[integration.status] || "text-slate-400"
                  }`}
                >
                  {integration.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{integration.lastEvent}</p>

              {integration.id === "twilio" && twilioStatus && twilioStatus.missingEnv.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                  <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.3em]">
                    <AlertTriangle className="h-3 w-3" />
                    Missing env
                  </div>
                  <ul className="mt-2 list-disc pl-4">
                    {twilioStatus.missingEnv.map((key) => (
                      <li key={key}>
                        <code className="text-sky-200">{key}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <button className="mae-button ghost text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  Test webhook
                </button>
                <Link
                  href="/dashboard/admin/automations"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200"
                >
                  Logs <Activity className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        {!isLoading && data && data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-slate-400">
            No integrations yet. Add Twilio/EzTexting credentials to `.env` to light these up.
          </div>
        )}
      </div>

      <TwilioDetails loading={twilioLoading} error={twilioError?.message} status={twilioStatus} />

      <PageFooterRail
        kicker="Integrations"
        title="Continue into automations or campaign execution"
        description="Once Twilio/EzTexting look good, jump into automations or campaigns from here."
        actions={[
          { label: "Automations", href: "/dashboard/admin/automations", icon: Activity },
          { label: "Campaigns", href: "/dashboard/admin/campaigns", icon: Radio },
        ]}
      />
    </div>
  );
}

function TwilioDetails({
  loading,
  error,
  status,
}: {
  loading: boolean;
  error?: string;
  status?: TwilioStatus;
}) {
  const missing = status?.missingEnv ?? [];
  const isReady = status?.status === "connected";

  return (
    <div className="glass-panel border border-white/10 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Twilio Integration</p>
      <h2 className="text-2xl font-semibold text-white">
        {loading ? "Checking status..." : isReady ? "Ready for outbound" : "Configuration needed"}
      </h2>
      {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
      {status && (
        <>
          <p className="mt-2 text-sm text-slate-400">{status.instructions}</p>
          <p className="mt-4 text-xs text-slate-400">
            Webhook URL: <code className="text-sky-200">{status.webhookUrl}</code>
          </p>
        </>
      )}

      {missing.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="font-semibold uppercase tracking-[0.3em]">Missing environment variables</p>
          <ul className="mt-2 list-disc pl-4">
            {missing.map((key) => (
              <li key={key}>
                <code className="text-sky-200">{key}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button className="mae-button primary text-xs">
          <Link2 className="h-4 w-4" />
          {isReady ? "Reconnect Twilio" : "Add credentials"}
        </button>
        <button className="mae-button ghost text-xs">
          <Activity className="h-4 w-4" />
          View Twilio logs
        </button>
      </div>
    </div>
  );
}
