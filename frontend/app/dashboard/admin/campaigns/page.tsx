/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import PageFooterRail from "@/components/PageFooterRail";
import { useCampaigns } from "@/lib/hooks/useCampaigns";
import Link from "next/link";
import { ArrowRight, Copy, Loader2, Pause, Play, Plug } from "lucide-react";

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns();

  return (
    <div className="space-y-8 text-slate-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">SMS Campaigns</p>
          <h1 className="text-3xl font-semibold text-white">Blast Board</h1>
          <p className="text-sm text-slate-400">
            Draft, schedule, and monitor ingestion-triggered blasts across EzTexting + Twilio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button className="mae-button primary text-xs">
            <Play className="h-4 w-4" />
            New blast
          </button>
          <button className="mae-button ghost text-xs">
            <Copy className="h-4 w-4" />
            Duplicate last
          </button>
        </div>
      </header>

      <div className="glass-panel overflow-hidden border border-white/10">
        {error && (
          <p className="px-6 py-3 text-sm text-rose-200">Unable to load campaigns. {error.message}</p>
        )}
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
            <tr>
              <th className="px-6 py-3">Campaign</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Messages</th>
              <th className="px-6 py-3">Last Activity</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-300" />
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{campaign.name}</p>
                    <p className="text-xs text-slate-500">{campaign.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs">{campaign.status}</span>
                  </td>
                  <td className="px-6 py-4">{campaign.channel}</td>
                  <td className="px-6 py-4">{campaign.messages.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{formatTimestamp(campaign.lastActivity)}</td>
                  <td className="px-6 py-4">{campaign.owner}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-1.5 text-emerald-200">
                        <Play className="h-3.5 w-3.5" />
                        Launch
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-4 py-1.5 text-amber-200">
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </button>
                      <Link
                        href={`/dashboard/chat/${campaign.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sky-200"
                      >
                        Details <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoading && data && data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  No campaigns yet. Run the ingestion script to seed Neon campaigns.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PageFooterRail
        kicker="Campaign Ops"
        title="Need to sync channels after editing blasts?"
        description="Jump over to Integrations to validate Twilio/EzTexting status or open Automations for scheduling."
        actions={[
          { label: "Integrations", href: "/dashboard/admin/integrations", icon: Plug },
          { label: "Automations", href: "/dashboard/admin/automations", icon: ArrowRight },
        ]}
      />
    </div>
  );
}

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
