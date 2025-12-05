"use client";

import PageFooterRail from "@/components/PageFooterRail";
import { useAgents } from "@/lib/hooks/useAgents";
import { Check, Circle, Loader2, Mail, PhoneCall, UserPlus, Activity } from "lucide-react";

const statusColors: Record<string, string> = {
  online: "text-emerald-300",
  away: "text-amber-300",
  offline: "text-slate-500",
};

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();

  return (
    <div className="space-y-8 text-slate-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Team Directory</p>
          <h1 className="text-3xl font-semibold text-white">Agents & Presence</h1>
          <p className="text-sm text-slate-400">
            Track availability, lead load, and quickly reach out across SMS/call workflows.
          </p>
        </div>
        <button className="mae-button primary text-xs">
          <UserPlus className="h-4 w-4" />
          Invite agent
        </button>
      </header>

      {error && <p className="text-sm text-rose-200">Unable to load agents. {error.message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && (
          <div className="col-span-2 flex items-center justify-center rounded-2xl border border-white/10 p-10 text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-sky-300" />
            Loading roster
          </div>
        )}
        {!isLoading &&
          agents?.map((agent) => (
            <article key={agent.id} className="glass-panel border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{agent.name}</p>
                  <p className="text-sm text-slate-400">{agent.role}</p>
                </div>
                <div className={`text-xs uppercase tracking-[0.3em] ${statusColors[agent.status]}`}>
                  <Circle className="mr-1 inline h-2 w-2" />
                  {agent.status}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <button className="mae-button ghost text-xs">
                  <Mail className="h-4 w-4" />
                  Message
                </button>
                <button className="mae-button ghost text-xs">
                  <PhoneCall className="h-4 w-4" />
                  Call
                </button>
                <button className="mae-button ghost text-xs">
                  <Check className="h-4 w-4" />
                  Assign lead
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Live leads: <span className="text-white">{agent.leadsAssigned}</span>
              </p>
              <p className="text-[11px] text-slate-500">Updated {new Date().toLocaleTimeString()}</p>
            </article>
          ))}
        {!isLoading && agents && agents.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-dashed border-white/20 p-8 text-center text-slate-400">
            No agents yet. Invite teammates from here once they exist in Prisma.
          </div>
        )}
      </div>

      <PageFooterRail
        kicker="Team Ops"
        title="Align staffing with campaign volume"
        description="Need to see which campaigns or automations need more humans? Jump straight from here."
        actions={[
          { label: "Campaigns", href: "/dashboard/admin/campaigns", icon: Activity },
          { label: "Automations", href: "/dashboard/admin/automations", icon: Check },
        ]}
      />
    </div>
  );
}
