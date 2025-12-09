"use client";

import React from "react";
import Link from "next/link";
import { 
  Users, 
  MessageSquare, 
  Flame, 
  Terminal, 
  ArrowRight,
  Clock 
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { useLeads } from "@/lib/hooks/useLeads";
import { THEME } from "@/lib/theme";
import { Avatar, StatusBadge } from "@/components/Shared";

export default function CommandCenterPage() {
  // Fetch "Radar" leads (Hot responses + Active conversations)
  const { leads, isLoading } = useLeads({ 
    statuses: ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE"] 
  });

  const activeCount = leads?.length || 0;
  const hotCount = leads?.filter(l => l.status === 'RESP_HOT').length || 0;

  return (
    <div className="space-y-8">
      {/* 1. Hero KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inbox Radar"
          value={activeCount}
          icon={MessageSquare}
          color="bg-indigo-500"
          trend={activeCount > 0 ? "Live" : "Quiet"}
          trendUp={activeCount > 0}
        />
        <StatCard
          label="Hot Leads"
          value={hotCount}
          icon={Flame}
          color="bg-rose-500"
          trend="Immediate action"
          trendUp={true}
        />
        <StatCard
          label="Total Database"
          value="39.5k"
          icon={Users}
          color="bg-slate-600"
          trend="Static"
          trendUp={false}
        />
        <StatCard
          label="Engine Status"
          value="Standby"
          icon={Terminal}
          color="bg-emerald-500"
          trend="Manage ingestion"
          trendUp={false}
          variant="status"
        />
      </div>

      {/* 2. Main Workspace Split */}
        <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Live Inbox Feed */}
          <div className={`lg:col-span-8 ${THEME.surface} flex flex-col rounded-2xl border ${THEME.border} overflow-hidden min-h-[400px]`}>
          <div className="flex items-center justify-between border-b border-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Clock size={18} className="text-indigo-400" />
              Response Feed
            </h3>
            <span className="text-xs text-slate-500">Real-time from Neon</span>
          </div>
          
          <div className="flex-1 divide-y divide-white/5">
            {isLoading && (
              <div className="flex h-full items-center justify-center p-10 text-slate-500">
                Loading live feed...
              </div>
            )}

            {!isLoading && activeCount === 0 && (
              <div className="h-full">
                {/* Replace with reusable EmptyState component */}
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <EmptyState
                  title="Inbox Zero"
                  description="No active conversations. Launch a campaign from the Admin tower to generate traffic."
                  actionLabel="Launch Campaign"
                  actionHref="/dashboard/admin/campaigns"
                  icon={MessageSquare}
                />
              </div>
            )}

            {leads?.map((lead) => (
              <Link 
                key={lead.id} 
                href={`/dashboard/chat/${lead.id}`}
                className="group flex items-center gap-4 p-4 transition-colors hover:bg-white/5"
              >
                <Avatar name={`${lead.contact.firstName || 'Unknown'} ${lead.contact.lastName || 'Lead'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold text-slate-200 group-hover:text-indigo-400">
                      {lead.contact.firstName} {lead.contact.lastName}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {new Date(lead.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={lead.status.replace('RESP_', '')} />
                    <span className="truncate text-xs text-slate-400">
                      {lead.property?.addressLine1 || "No address data"}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-700 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Quick Actions / Context */}
          <div className="lg:col-span-4 space-y-6">
          {/* Action Card */}
          <div className={`${THEME.surface} rounded-2xl border ${THEME.border} p-6`}>
            <h3 className="font-semibold text-white">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/queue" className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 hover:bg-white/10">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Start Call Queue
                </span>
                <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard/admin/campaigns" className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 hover:bg-white/10">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Draft Blast
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Engine Health Stub */}
          <div className={`${THEME.surface} rounded-2xl border ${THEME.border} p-6`}>
            <h3 className="font-semibold text-white">System Health</h3>
            <div className="mt-4 space-y-4">
              <HealthRow label="Neon Database" status="healthy" />
              <HealthRow label="EzTexting API" status="healthy" />
              <HealthRow label="Twilio Gateway" status="disconnected" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, status }: { label: string, status: 'healthy' | 'warning' | 'disconnected' }) {
  const colors = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    disconnected: "bg-slate-700"
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${colors[status]}`} />
        <span className="uppercase text-slate-300">{status}</span>
      </div>
    </div>
  );
}
