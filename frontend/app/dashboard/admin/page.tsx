"use client";

import PageFooterRail from "@/components/PageFooterRail";
import { useAgents } from "@/lib/hooks/useAgents";
import { useAutomations } from "@/lib/hooks/useAutomations";
import { useCampaigns } from "@/lib/hooks/useCampaigns";
import { useIntegrations } from "@/lib/hooks/useIntegrations";
import Link from "next/link";
import { Activity, ArrowRight, Loader2, PlugZap, Radio, Settings2, Users } from "lucide-react";

export default function AdminHome() {
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useCampaigns();
  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useAgents();
  const {
    data: integrations,
    isLoading: integrationsLoading,
    error: integrationsError,
  } = useIntegrations();
  const {
    data: automations,
    isLoading: automationsLoading,
    error: automationsError,
  } = useAutomations();

  const campaignCount = campaigns?.length ?? 0;
  const agentCount = agents?.length ?? 0;
  const integrationConnected =
    integrations?.filter((integration) => integration.status === "connected").length ?? 0;

  return (
    <div className="space-y-10 text-slate-100">
      <section className="glass-panel border border-white/10 p-8">
        <div className="flex flex-col gap-4">
          <span className="pill text-amber-200/80">Admin Control Tower</span>
          <div>
            <h1 className="text-4xl font-semibold text-white">Operations & Integrations</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage campaigns, agents, automations, and integrations that sync the Engine with the Storefront.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/admin/campaigns" className="mae-button primary text-xs">
              Launch campaign
            </Link>
            <Link href="/dashboard/admin/agents" className="mae-button ghost text-xs">
              Invite agent
            </Link>
            <Link href="/dashboard/admin/integrations" className="mae-button ghost text-xs">
              Configure channels
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <AdminCard
          title="Campaigns"
          icon={<Radio className="h-5 w-5 text-sky-300" />}
          description={
            campaignsLoading ? (
              <CardLoader />
            ) : campaignsError ? (
              "Unable to load campaigns"
            ) : (
              `${campaignCount} draft/running campaigns`
            )
          }
          href="/dashboard/admin/campaigns"
        />
        <AdminCard
          title="Agents"
          icon={<Users className="h-5 w-5 text-emerald-300" />}
          description={
            agentsLoading ? <CardLoader /> : agentsError ? "Unable to load agents" : `${agentCount} active agents`
          }
          href="/dashboard/admin/agents"
        />
        <AdminCard
          title="Integrations"
          icon={<Settings2 className="h-5 w-5 text-amber-300" />}
          description={
            integrationsLoading ? (
              <CardLoader />
            ) : integrationsError ? (
              "Unable to load integrations"
            ) : (
              `${integrationConnected} connected`
            )
          }
          href="/dashboard/admin/integrations"
        />
      </section>

      <section className="glass-panel border border-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Recent Automation Footprints</h2>
          <Link href="/dashboard/admin/automations" className="inline-flex items-center gap-2 text-xs text-sky-300">
            View automations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {automationsError && (
          <p className="mt-4 text-sm text-rose-200">Unable to load automations. {automationsError.message}</p>
        )}

        <div className="timeline mt-6 space-y-4">
          {automationsLoading && <CardLoader />}
          {!automationsLoading &&
            automations?.map((auto) => (
              <div key={auto.id} className="timeline-item">
                <p className="text-sm font-semibold text-white">{auto.name}</p>
                <p className="text-xs text-slate-400">
                  {auto.cadence} · {auto.status} · Last run {formatTimestamp(auto.lastRun)}
                </p>
              </div>
            ))}
          {!automationsLoading && automations && automations.length === 0 && (
            <p className="text-xs text-slate-500">No automation data yet. Run script:import-staged to seed logs.</p>
          )}
        </div>
      </section>

      <PageFooterRail
        kicker="Admin Ops"
        title="Maintain campaign health without leaving Storefront"
        description="Jump into integrations or launch scripts directly after reviewing the tower summary."
        actions={[
          { label: "Campaigns", href: "/dashboard/admin/campaigns", icon: Radio, variant: "primary" },
          { label: "Agents", href: "/dashboard/admin/agents", icon: Users },
          { label: "Integrations", href: "/dashboard/admin/integrations", icon: PlugZap },
        ]}
      />
    </div>
  );
}

function AdminCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="glass-panel border border-white/10 p-6 transition hover:border-sky-400/50 hover:bg-slate-900/70"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Manage</p>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        {icon}
      </div>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs text-sky-300">
        Open module <Activity className="h-4 w-4" />
      </div>
    </Link>
  );
}

function CardLoader() {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      <Loader2 className="h-3 w-3 animate-spin text-sky-300" />
      Loading
    </span>
  );
}

function formatTimestamp(value: string | undefined) {
  if (!value || value === "never" || value === "queued") return value ?? "unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
