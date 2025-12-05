"use client";

import CallOutcomeModal from "@/components/CallOutcomeModal";
import HeatBadge from "@/components/HeatBadge";
import LeadActionButtons from "@/components/LeadActionButtons";
import LeadStatusBadge from "@/components/LeadStatusBadge";
import PageFooterRail from "@/components/PageFooterRail";
import { Lead } from "@/lib/api";
import { useLeads } from "@/lib/hooks/useLeads";
import {
  Clock4,
  PhoneCall,
  PhoneForwarded,
  RadioReceiver,
  Settings2,
  UserPlus,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";

export default function QueuePage() {
  const {
    data: leadsData,
    isLoading,
    error,
  } = useLeads({ statuses: ["QUEUED_FOR_CALL"], queryKey: "queue" });
  const leads: Lead[] = leadsData ?? [];
  const [activeCallModal, setActiveCallModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const queueSize = leads.length;
  const medianTta = queueSize ? "00:45" : "--:--";
  const contactablePct = queueSize ? 92 : 0;

  if (isLoading) return <div className="p-10 text-slate-300">Loading Call Queue…</div>;

  if (error)
    return (
      <div className="p-10 text-rose-200">
        Unable to load queue. {error.message}
      </div>
    );

  return (
    <div className="space-y-8 text-slate-100">
      <section className="glass-panel border border-white/10 p-8">
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-green-200/70">
            Live Call Queue
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-white">Phone-ready Sellers</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Leads flow here when SMS replies request a call. Pair with your headset, click-to-dial landlines, and log
              outcomes back into Neon for the Engine to pick up next actions.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <QueueMetric
            icon={PhoneCall}
            label="Queued leads"
            value={queueSize}
            helper="Ready for human call"
          />
          <QueueMetric icon={Clock4} label="Median time-to-answer" value={medianTta} helper="Last 24 hrs" />
          <QueueMetric
            icon={RadioReceiver}
            label="Contactable"
            value={`${contactablePct}%`}
            helper="Landline confirmed"
          />
        </div>
      </section>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dial List</p>
            <h2 className="text-2xl font-semibold text-white">Prioritized calls</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5">
            <PhoneForwarded className="h-3.5 w-3.5 text-emerald-300" />
            Sync to dialer
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <button className="mae-button primary text-xs">
            <PhoneCall className="h-4 w-4" />
            Start auto-dial
          </button>
          <button className="mae-button ghost text-xs">
            <UserPlus className="h-4 w-4" />
            Assign closer
          </button>
          <button className="mae-button ghost text-xs">
            <XCircle className="h-4 w-4 text-rose-300" />
            Skip lead
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Property</th>
                <th className="px-6 py-3 font-medium">Heat</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    No queued calls. When owners reply &quot;call me&quot; via SMS, they appear here automatically.
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr key={lead.id} className="bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">
                      {lead.contact.firstName} {lead.contact.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{lead.contact.phoneE164}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-200">{lead.property?.addressLine1 ?? "Unknown address"}</p>
                    <p className="text-xs text-slate-500">
                      {lead.property?.city ?? "N/A"}, {lead.property?.state ?? "--"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <HeatBadge score={lead.sentimentScore} status={lead.status} />
                  </td>
                  <td className="px-6 py-4">
                    <LeadStatusBadge status="QUEUED_FOR_CALL" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <LeadActionButtons leadId={lead.id} context="queue" />
                      <button
                        className="mae-button ghost text-xs"
                        onClick={() =>
                          setActiveCallModal({
                            id: lead.id,
                            name: `${lead.contact.firstName ?? ""} ${lead.contact.lastName ?? ""}`.trim() ||
                              lead.contact.phoneE164,
                          })
                        }
                      >
                        Log call
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PageFooterRail
        kicker="Handoff"
        title="Flip between dialing and campaign execution"
        description="Move between queue, chat, and admin tools without losing the accepting-button mindset."
        actions={[
          { label: "Inbox", href: "/dashboard", icon: PhoneCall, variant: "primary" },
          { label: "Admin Tower", href: "/dashboard/admin", icon: Settings2 },
        ]}
      />

      <CallOutcomeModal
        open={Boolean(activeCallModal)}
        leadId={activeCallModal?.id ?? null}
        leadName={activeCallModal?.name}
        onClose={() => setActiveCallModal(null)}
      />
    </div>
  );
}

type QueueMetricProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number | string;
  helper: string;
};

function QueueMetric({ icon: Icon, label, value, helper }: QueueMetricProps) {
  return (
    <div className="kpi-card flex flex-col gap-2">
      <Icon className="h-5 w-5 text-emerald-300" />
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{helper}</p>
    </div>
  );
}
