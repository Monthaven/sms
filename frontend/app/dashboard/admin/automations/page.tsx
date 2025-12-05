"use client";

import PageFooterRail from "@/components/PageFooterRail";
import { useAutomations } from "@/lib/hooks/useAutomations";
import { Loader2, Pause, Play, PlugZap, RefreshCw } from "lucide-react";

const statusClasses: Record<string, string> = {
  healthy: "text-emerald-300",
  warning: "text-amber-300",
  paused: "text-rose-300",
};

export default function AutomationsPage() {
  const { data, isLoading, error } = useAutomations();

  return (
    <div className="space-y-8 text-slate-100">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Automations</p>
        <h1 className="text-3xl font-semibold text-white">Engine + Storefront Schedules</h1>
        <p className="text-sm text-slate-400">
          Cron schedules, webhook monitors, and health pulses for ingestion + campaign coordination.
        </p>
      </header>

      <div className="glass-panel border border-white/10">
        {error && <p className="px-6 py-4 text-sm text-rose-200">Unable to load automations. {error.message}</p>}

        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
            <tr>
              <th className="px-6 py-3">Automation</th>
              <th className="px-6 py-3">Cadence</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Last run</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-300" />
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.map((auto) => (
                <tr key={auto.id}>
                  <td className="px-6 py-4 font-semibold text-white">{auto.name}</td>
                  <td className="px-6 py-4 text-slate-400">{auto.cadence}</td>
                  <td className="px-6 py-4">{auto.owner}</td>
                  <td className={`px-6 py-4 capitalize ${statusClasses[auto.status]}`}>{auto.status}</td>
                  <td className="px-6 py-4">{formatTimestamp(auto.lastRun)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-1.5 text-emerald-200">
                        <Play className="h-3.5 w-3.5" />
                        Run now
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-4 py-1.5 text-amber-200">
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-slate-200">
                        <RefreshCw className="h-3.5 w-3.5" />
                        View logs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoading && data && data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                  No automations recorded. Once ingestion jobs run, telemetry will populate here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PageFooterRail
        kicker="Automation Links"
        title="Need webhook insight or to tweak campaigns?"
        description="Access integration health or edit blasts directly once you verify the event cadence."
        actions={[
          { label: "Integrations", href: "/dashboard/admin/integrations", icon: PlugZap },
          { label: "Campaigns", href: "/dashboard/admin/campaigns", icon: RefreshCw },
        ]}
      />
    </div>
  );
}

function formatTimestamp(value: string) {
  if (!value || value === "never" || value === "queued") return value ?? "unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
