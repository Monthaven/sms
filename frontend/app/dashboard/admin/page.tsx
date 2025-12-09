"use client";

import Link from "next/link";
import { Activity, ArrowRight, Radio, Users, Settings2, PlugZap, Database } from "lucide-react";
import PageFooterRail from "@/components/PageFooterRail";
import { useCampaigns } from "@/lib/hooks/useCampaigns";
import { useAgents } from "@/lib/hooks/useAgents";

export default function AdminPage() {
  const { data: campaigns } = useCampaigns();
  const { data: agents } = useAgents();

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="glass-panel border border-white/10 p-8 relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-amber-200">
            Control Tower
          </span>
          <h1 className="mt-4 text-4xl font-bold text-white">System Operations</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Manage the Engine's configuration. Launch mass blasts, assign agents, and monitor 
            the health of the EzTexting/Twilio bridges.
          </p>
        </div>
      </section>

      {/* Main Modules Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <AdminCard
          title="Campaigns"
          icon={Radio}
          metric={campaigns?.length || 0}
          label="Active & Draft"
          href="/dashboard/admin/campaigns"
          color="text-sky-400"
        />
        <AdminCard
          title="Agents"
          icon={Users}
          metric={agents?.length || 0}
          label="Team Members"
          href="/dashboard/admin/agents"
          color="text-emerald-400"
        />
        <AdminCard
          title="Integrations"
          icon={PlugZap}
          metric={2}
          label="Channels Connected"
          href="/dashboard/admin/integrations"
          color="text-amber-400"
        />
      </div>

      {/* Engine Status */}
      <section className="glass-panel border border-white/5 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <Database size={20} className="text-slate-500" />
            Data Source Truth
          </h2>
          <div className="text-xs font-mono text-slate-500">
            Source: Neon Postgres (Direct)
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white/[0.02] p-4 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-300">Engine (Backend)</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            </div>
            <p className="text-xs text-slate-500">
              Responsible for CSV Ingestion, bulk SMS blasts, and address verification.
              Run via `npm run engine:ingest` locally.
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] p-4 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-300">Storefront (UI)</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            </div>
            <p className="text-xs text-slate-500">
              Responsible for Lead Management, Chat, and Call Queue.
              Running on Vercel Edge Network.
            </p>
          </div>
        </div>
      </section>

      <PageFooterRail
        kicker="Next Steps"
        title="Ready to blast?"
        description="Head to Campaigns to draft a new broadcast or check Integrations to verify provider credits."
        actions={[
          { label: "Open Campaigns", href: "/dashboard/admin/campaigns", icon: Radio, variant: "primary" },
          { label: "Check Credits", href: "/dashboard/admin/integrations", icon: Settings2 },
        ]}
      />
    </div>
  );
}

function AdminCard({ title, icon: Icon, metric, label, href, color }: any) {
  return (
    <Link href={href} className="group glass-panel border border-white/10 p-6 transition-all hover:border-white/20 hover:bg-white/[0.03]">
      <div className="flex justify-between items-start">
        <div className={`rounded-lg bg-white/5 p-3 ${color}`}>
          <Icon size={24} />
        </div>
        <ArrowRight className="text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-slate-400" size={18} />
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-white">{metric}</p>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-300">
          Manage {title}
        </p>
      </div>
    </Link>
  );
}
