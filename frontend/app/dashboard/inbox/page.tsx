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
import {
  MessageSquare,
  Flame,
  Filter,
  Search,
  Phone,
  Building,
  MapPin,
  Clock4,
  Inbox as InboxIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import LeadActionButtons from "@/components/LeadActionButtons";
import CallLogButton from "@/components/CallLogButton";
import ReplyComposer from "@/components/ReplyComposer";

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
    return { total, hot, warm, queue };
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card padded className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <MessageSquare size={18} className="text-blue-400" />
          </Card>
          <Card padded className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Hot</p>
              <p className="text-2xl font-bold text-rose-300">{stats.hot}</p>
            </div>
            <Flame size={18} className="text-rose-400" />
          </Card>
          <Card padded className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Warm</p>
              <p className="text-2xl font-bold text-orange-300">{stats.warm}</p>
            </div>
            <Filter size={18} className="text-orange-400" />
          </Card>
          <Card padded className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Call Queue</p>
              <p className="text-2xl font-bold text-purple-300">{stats.queue}</p>
            </div>
            <Phone size={18} className="text-purple-400" />
          </Card>
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
                <div className="text-slate-500 text-sm animate-pulse">Loading leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-slate-500 text-sm">No leads match this filter.</div>
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
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase">
                          {lead.status}
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
          <Card className="flex flex-col min-h-0">
            {!selected ? (
              <div className="text-slate-500 text-sm">Select a conversation.</div>
            ) : (
              <>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contact</p>
                      <h3 className="text-xl font-bold text-white leading-tight">
                        {selected.contact?.firstName} {selected.contact?.lastName}
                    </h3>
                    <p className="text-sm text-slate-400 font-mono">
                      {selected.contact?.phoneE164}
                    </p>
                    </div>
                    <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      icon={<Phone size={14} />}
                      onClick={() => {
                        if (selected.contact?.phoneE164) {
                          window.location.href = `tel:${selected.contact.phoneE164}`;
                        }
                      }}
                    >
                      Call
                    </Button>
                    <Button
                      className="text-xs"
                      icon={<MessageSquare size={14} />}
                      onClick={() => {
                        window.location.href = `/dashboard/chat/${selected.id}`;
                      }}
                    >
                      Reply
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <LeadActionButtons leadId={selected.id} context="inbox" />
                  <CallLogButton leadId={selected.id} leadName={`${selected.contact?.firstName ?? ""} ${selected.contact?.lastName ?? ""}`} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                    <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">
                      Status
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        statusStyles[selected.status as StatusKey]?.cls ??
                        "bg-slate-800 text-slate-200 border-slate-700"
                      }`}
                    >
                      {statusStyles[selected.status as StatusKey]?.label ?? selected.status}
                    </span>
                  </div>
                  {selected.property && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold mb-1">
                        Property
                      </p>
                      <p className="text-sm text-slate-200 flex items-center gap-1">
                        <MapPin size={12} /> {selected.property.addressLine1}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selected.property.city}, {selected.property.state}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-rows-[1fr_auto] gap-3 min-h-0">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 overflow-y-auto custom-scrollbar space-y-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-slate-500">
                      <span>Thread</span>
                      <span>{interactions.length} messages</span>
                    </div>
                    {interactions.length === 0 ? (
                      <div className="text-xs text-slate-500">
                        No message history yet. Replies will appear here once logged.
                      </div>
                    ) : (
                      interactions.map((msg) => (
                        <div
                          key={msg.id}
                          className={clsx(
                            "rounded-xl border px-3 py-2 text-sm",
                            msg.direction === "INBOUND"
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-blue-500/30 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold uppercase tracking-[0.2em]">
                              {msg.direction}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-2 text-slate-100 whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <ReplyComposer leadId={selected.id} />
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
