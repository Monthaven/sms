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
import { StatCard } from "../../components/StatCard";
import { useLeads } from "../../lib/hooks/useLeads";
import { THEME } from "../../lib/theme";
import EmptyState from "../../components/EmptyState";
import { Avatar, StatusBadge } from "../../components/Shared";

export default function CommandCenterPage() {
  const { leads, isLoading } = useLeads({ 
    statuses: ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE"] 
  });

  const activeCount = leads?.length || 0;
  const hotCount = leads?.filter(l => l.status === 'RESP_HOT').length || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          variant={hotCount > 0 ? "alert" : "default"}
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
           trend="Online"
           trendUp={true}
           variant="status"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
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
              <EmptyState 
                title="Inbox Zero"
                description="No active conversations. Launch a campaign from the Admin tower to generate traffic."
                actionLabel="Launch Campaign"
                onAction={() => window.location.href = '/dashboard/admin/campaigns'}
              />
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

        <div className="lg:col-span-4 space-y-6">
          <div className={`${THEME.surface} rounded-2xl border ${THEME.border} p-6`}>
            <h3 className="font-semibold text-white">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/queue" className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 hover:bg-white/10 hover:border-emerald-500/30 transition-all">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Start Call Queue
                </span>
                <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard/admin/campaigns" className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 hover:bg-white/10 hover:border-amber-500/30 transition-all">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Draft Blast
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className={`${THEME.surface} rounded-2xl border ${THEME.border} p-6`}>
            <h3 className="font-semibold text-white">System Health</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Neon Database</span>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="uppercase text-slate-300">healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">EzTexting API</span>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="uppercase text-slate-300">healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Twilio Gateway</span>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                  <span className="uppercase text-slate-500">disconnected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}