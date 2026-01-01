/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useMemo, useState } from "react";
import { useLeads } from "@/lib/hooks/useLeads";
import Card from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import StatCard from "@/components/StatCard";
import HeatBadge from "@/components/HeatBadge";
import EmptyState from "@/components/EmptyState";
import { TwilioCallButton } from "@/components/TwilioCallButton";
import {
  MessageSquare,
  Flame,
  Search,
  Phone,
  Building,
  Clock4,
  Inbox as InboxIcon,
  Users,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import LeadActionButtons from "@/components/LeadActionButtons";
import CallLogButton from "@/components/CallLogButton";
import ReplyComposer from "@/components/ReplyComposer";
import { Sparkles } from "lucide-react";

type StatusKey =
  | "RESP_HOT"
  | "RESP_WARM"
  | "RESP_COLD"
  | "RESP_STOP"
  | "QUEUED_FOR_CALL"
  | "NEW"
  | "CONVERSATION_ACTIVE";

const statusStyles: Record<
  StatusKey,
  { label: string; cls: string }
> = {
  RESP_HOT: { label: "Hot", cls: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
  RESP_WARM: { label: "Warm", cls: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  RESP_COLD: { label: "Cold", cls: "bg-slate-700 text-slate-200 border-slate-600" },
  RESP_STOP: { label: "Stop", cls: "bg-red-500/10 text-red-300 border-red-500/30" },
  QUEUED_FOR_CALL: { label: "Call Queue", cls: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  NEW: { label: "New", cls: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  CONVERSATION_ACTIVE: { label: "Active", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
};

const filters: { id: string; label: string; statuses?: StatusKey[] }[] = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot", statuses: ["RESP_HOT"] },
  { id: "warm", label: "Warm", statuses: ["RESP_WARM"] },
  { id: "active", label: "Active", statuses: ["CONVERSATION_ACTIVE"] },
  { id: "queue", label: "Call Queue", statuses: ["QUEUED_FOR_CALL"] },
  { id: "new", label: "New", statuses: ["NEW"] },
];

export default function InboxPage() {
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { leads, isLoading } = useLeads(
    activeFilter.statuses ? { statuses: activeFilter.statuses } : undefined
  );

  const filteredLeads = useMemo(() => {
    const q = query.toLowerCase().trim();
    const data = leads ?? [];
    return data.filter((lead) => {
      if (!q) return true;
      const name = `${lead.contact?.firstName ?? ""} ${lead.contact?.lastName ?? ""}`.toLowerCase();
      const phone = lead.contact?.phoneE164?.toLowerCase() ?? "";
      const address = lead.property?.addressLine1?.toLowerCase() ?? "";
      return name.includes(q) || phone.includes(q) || address.includes(q);
    });
  }, [leads, query]);

  const selected = selectedLeadId
    ? filteredLeads.find((l) => l.id === selectedLeadId) ?? filteredLeads[0]
    : filteredLeads[0];
  const interactions =
    selected?.contact?.interactions?.slice()?.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ) ?? [];

  const stats = useMemo(() => {
    const total = leads?.length ?? 0;
    const hot = leads?.filter((l) => l.status === "RESP_HOT").length ?? 0;
    const warm = leads?.filter((l) => l.status === "RESP_WARM").length ?? 0;
    const queue = leads?.filter((l) => l.status === "QUEUED_FOR_CALL").length ?? 0;
    const active = leads?.filter((l) => l.status === "CONVERSATION_ACTIVE").length ?? 0;
    return { total, hot, warm, queue, active };
  }, [leads]);

  return (
    <div className="mx-auto max-w-[1800px] space-y-8 pb-10">
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <InboxIcon size={18} className="text-blue-400" /> Inbox
            </h2>
            <p className="text-slate-400 text-sm">
              <span className="text-emerald-400 font-bold">{stats.total}</span> leads in view.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 flex items-center gap-2 text-sm text-slate-300">
              <Clock4 size={14} className="text-blue-400" />
              <span>Est. Time: 45m</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.id}
                variant={activeFilter.id === f.id ? "primary" : "secondary"}
                className="text-xs"
                onClick={() => setActiveFilter(f)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex-1 min-w-[220px] max-w-sm relative ml-auto">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, address"
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<MessageSquare size={18} />}
            variant="default"
            onClick={() => setActiveFilter(filters[0])}
          />
          <StatCard
            label="Hot"
            value={stats.hot}
            icon={<Flame size={18} />}
            variant="hot"
            onClick={() => setActiveFilter(filters[1])}
          />
          <StatCard
            label="Warm"
            value={stats.warm}
            icon={<TrendingUp size={18} />}
            variant="warm"
            onClick={() => setActiveFilter(filters[2])}
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={<Users size={18} />}
            variant="success"
            onClick={() => setActiveFilter(filters[3])}
          />
          <StatCard
            label="Call Queue"
            value={stats.queue}
            icon={<Phone size={18} />}
            variant="purple"
            onClick={() => setActiveFilter(filters[4])}
          />
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-6 min-h-0">
          {/* List */}
          <Card className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Conversations</h3>
              <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                {filteredLeads.length} Visible
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                  <span className="text-slate-500 text-sm">Loading leads...</span>
                </div>
              ) : filteredLeads.length === 0 ? (
                <EmptyState
                  title="No leads found"
                  description="No leads match your current filter criteria. Try adjusting your filters or search query."
                  actionLabel="View All Leads"
                  onAction={() => {
                    setActiveFilter(filters[0]);
                    setQuery("");
                  }}
                />
              ) : (
                filteredLeads.map((lead) => {
                  const style = statusStyles[lead.status as StatusKey] ?? {
                    label: lead.status,
                    cls: "bg-slate-800 text-slate-200 border-slate-700",
                  };
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={clsx(
                        "w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3 hover:border-blue-500/30 hover:bg-slate-800/50 transition-colors",
                        selected?.id === lead.id ? "border-blue-500/40 bg-slate-800/60" : ""
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-1 rounded-full border ${style.cls}`}>
                            {style.label}
                          </span>
                          <HeatBadge status={lead.status} />
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            {lead.contact?.firstName} {lead.contact?.lastName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{lead.contact?.phoneE164}</p>
                        </div>
                        {lead.property && (
                          <div className="text-right">
                            <p className="text-xs text-indigo-300 flex items-center gap-1">
                              <Building size={12} /> {lead.property.addressLine1}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {lead.property.city}, {lead.property.state}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Detail */}
          <Card className="flex flex-col min-h-0 overflow-hidden">
            {!selected ? (
              <EmptyState
                title="Select a Conversation"
                description="Choose a lead from the list to view details and conversation history."
              />
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header - fixed */}
                <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contact</p>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {selected.contact?.firstName} {selected.contact?.lastName}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono">
                      {selected.contact?.phoneE164}
                    </p>
                    <div className="mt-2">
                      <HeatBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.contact?.phoneE164 && (
                      <TwilioCallButton
                        phoneNumber={selected.contact.phoneE164}
                        leadId={selected.id}
                        variant="secondary"
                        size="sm"
                      >
                        Call
                      </TwilioCallButton>
                    )}
                    {selected.contact && (
                      <Button
                        className="text-xs"
                        icon={<Sparkles size={14} />}
                        onClick={() => {
                          window.location.href = `/sequences?contactId=${selected.contact?.phoneE164 ?? ""}`;
                        }}
                      >
                        Enroll
                      </Button>
                    )}
                    <Button
                      className="text-xs"
                      icon={<MessageSquare size={14} />}
                      onClick={() => {
                        window.location.href = `/dashboard/chat/${selected.id}`;
                      }}
                    >
                      Chat
                    </Button>
                  </div>
                </div>

                {/* Actions - fixed */}
                <div className="flex flex-wrap items-center gap-3 mb-3 shrink-0">
                  <LeadActionButtons leadId={selected.id} context="inbox" />
                  <CallLogButton leadId={selected.id} leadName={`${selected.contact?.firstName ?? ""} ${selected.contact?.lastName ?? ""}`} />
                </div>

                {/* Thread + Reply - scrollable area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Thread messages - scrollable */}
                  <div className="flex-1 min-h-0 rounded-xl border border-slate-800 bg-slate-900/40 p-3 overflow-y-auto custom-scrollbar space-y-2 mb-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500 pb-2 border-b border-slate-800">
                      <span>Thread</span>
                      <span>{interactions.length} messages</span>
                    </div>
                    {interactions.length === 0 ? (
                      <div className="text-xs text-slate-500 py-4 text-center">
                        No messages yet
                      </div>
                    ) : (
                      interactions.map((msg) => (
                        <div
                          key={msg.id}
                          className={clsx(
                            "rounded-lg border px-3 py-2 text-sm",
                            msg.direction === "INBOUND"
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-blue-500/30 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold uppercase tracking-wider">
                              {msg.direction}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1.5 text-slate-100 whitespace-pre-wrap text-sm">{msg.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply composer - pinned at bottom */}
                  <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <ReplyComposer leadId={selected.id} />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
