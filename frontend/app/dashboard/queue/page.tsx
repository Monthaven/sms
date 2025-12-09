"use client";

import React, { useState } from "react";
import { PhoneCall, Clock4, RadioReceiver, PhoneForwarded, XCircle, UserPlus, Phone } from "lucide-react";
import { useLeads } from "@/lib/hooks/useLeads";
import { Avatar, StatusBadge } from "@/components/Shared";
import LeadActionButtons from "@/components/LeadActionButtons";
import PageFooterRail from "@/components/PageFooterRail";
import CallOutcomeModal from "@/components/CallOutcomeModal"; // Ensure this component exists or stub it

export default function QueuePage() {
  // Only fetch leads explicitly needing a call
  const { data: leadsData, isLoading, error } = useLeads({ statuses: ["QUEUED_FOR_CALL"] });
  const leads = leadsData ?? [];
  const [activeCallModal, setActiveCallModal] = useState<{ id: string; name: string } | null>(null);

  const queueSize = leads.length;

  return (
    <div className="space-y-8">
      {/* Header / Hero */}
      <div className="glass-panel border border-white/10 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">
              Live Queue
            </span>
            <h1 className="mt-4 text-3xl font-bold text-white">Phone-ready Sellers</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Leads appear here when they reply "call me" or are flagged by the Engine. 
              Click-to-dial and log outcomes to advance the workflow.
            </p>
          </div>
          
          <div className="flex gap-4">
            <QueueMetric icon={PhoneCall} label="Pending" value={queueSize} />
            <QueueMetric icon={Clock4} label="Wait Time" value={queueSize > 0 ? "45m" : "--"} />
          </div>
        </div>
      </div>

      {/* The List */}
      <div className="glass-panel overflow-hidden border border-white/10">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Dial List ({queueSize})
          </h2>
          <div className="flex gap-2">
            <button className="mae-button ghost text-xs">
              <PhoneForwarded className="h-3.5 w-3.5" /> Sync Dialer
            </button>
          </div>
        </div>

        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Lead</th>
              <th className="px-6 py-4 font-medium">Property</th>
              <th className="px-6 py-4 font-medium">Signal</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading queue...</td></tr>
            )}
            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-400">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                    <RadioReceiver className="h-6 w-6 text-slate-600" />
                  </div>
                  Queue empty. Excellent work.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="group hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={lead.contact.firstName || "Lead"} />
                    <div>
                      <p className="font-semibold text-slate-200">
                        {lead.contact.firstName} {lead.contact.lastName}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{lead.contact.phoneE164}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-300">{lead.property?.addressLine1}</p>
                  <p className="text-xs text-slate-500">{lead.property?.city}, {lead.property?.state}</p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status="HOT" />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setActiveCallModal({ id: lead.id, name: `${lead.contact.firstName} ${lead.contact.lastName}` })}
                      className="mae-button primary text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </button>
                    <LeadActionButtons leadId={lead.id} context="queue" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PageFooterRail 
        kicker="Workflow"
        title="Finished calls?"
        description="Leads marked as 'Contacted' move to the Inbox. 'No Answer' stays here for a retry."
        actions={[]}
      />

      <CallOutcomeModal
        open={!!activeCallModal}
        leadId={activeCallModal?.id || null}
        leadName={activeCallModal?.name}
        onClose={() => setActiveCallModal(null)}
      />
    </div>
  );
}

function QueueMetric({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 px-6 py-3 border border-white/5">
      <Icon className="mb-1 h-5 w-5 text-emerald-400" />
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}
