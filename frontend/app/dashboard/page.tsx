"use client";

import React from "react";
import {
  Users,
  CheckCircle2,
  MessageSquare,
  DollarSign,
  Clock,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useLeads } from "@/lib/hooks/useLeads";
import { THEME } from "@/lib/theme";

const MOCK_LEADS = [
  { id: "1", firstName: "Robert", lastName: "Vance", messages: [{ content: "Yes, looking for 1.2M" }] },
  { id: "2", firstName: "Sarah", lastName: "Jenkins", messages: [] },
  { id: "3", firstName: "James", lastName: "Kowalski", messages: [{ content: "Call me Tuesday" }] },
  { id: "4", firstName: "Elena", lastName: "Rodriguez", messages: [] },
];

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg">
      {initials}
    </div>
  );
};

export default function DashboardPage() {
  const { leads, isLoading } = useLeads();

  const displayLeads =
    leads && leads.length > 0 ? leads : (MOCK_LEADS as any[]);
  const leadCount = leads?.length || 842;

  const stats = [
    {
      label: "Active Leads",
      value: leadCount,
      icon: Users,
      color: "bg-blue-500",
      trend: "12%",
      trendUp: true,
    },
    {
      label: "Hot Opportunities",
      value: displayLeads.length > 10 ? 12 : 3,
      icon: CheckCircle2,
      color: "bg-rose-500",
      trend: "5%",
      trendUp: true,
    },
    {
      label: "Messages (24h)",
      value: "142",
      icon: MessageSquare,
      color: "bg-amber-500",
      trend: "2%",
      trendUp: false,
    },
    {
      label: "Pipeline Value",
      value: "$4.2M",
      icon: DollarSign,
      color: "bg-emerald-500",
      trend: "8%",
      trendUp: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8 pb-20 md:pb-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div
          className={`md:col-span-2 ${THEME.surface} rounded-2xl border ${THEME.border} overflow-hidden`}
        >
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <Clock size={20} className="text-indigo-500" />
              Live Feed
            </h3>
            <button className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white">
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-800/50">
            {displayLeads.slice(0, 5).map((lead: any) => (
              <div
                key={lead.id}
                className="group flex cursor-pointer items-center gap-4 p-5 transition-colors hover:bg-white/5"
              >
                <Avatar name={`${lead.firstName} ${lead.lastName}`} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-200 transition-colors group-hover:text-indigo-400">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <span className="text-[10px] font-mono text-gray-600">
                      2h ago
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className={
                        lead.messages && lead.messages.length > 0
                          ? "text-indigo-400"
                          : "text-gray-600"
                      }
                    >
                      {lead.messages && lead.messages.length > 0
                        ? "Reply:"
                        : "Status:"}
                    </span>
                    {lead.messages && lead.messages.length > 0
                      ? lead.messages[lead.messages.length - 1].content ||
                        lead.messages[lead.messages.length - 1].body
                      : "Ready for review"}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-gray-700 transition-colors group-hover:text-gray-400"
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${THEME.surface} flex flex-col justify-center rounded-2xl border ${THEME.border} p-6`}
        >
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold text-white">Lead Sources</h3>
            <p className="mt-1 text-xs text-gray-500">This Month</p>
          </div>
          <div className="my-4 flex justify-center">
            <div className="flex h-48 w-48 items-center justify-center rounded-full border-[16px] border-[#1E2538] border-t-indigo-500 border-r-emerald-500 border-b-[#1E2538] rotate-45 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
              <div className="rotate-[-45deg] text-center">
                <span className="block text-3xl font-bold text-white">
                  {leadCount}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">
                  Leads
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                DealMachine
              </span>
              <span className="font-mono text-white">65%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Web Inbound
              </span>
              <span className="font-mono text-white">25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
