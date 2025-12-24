/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import { Users, Bot, Plug, ArrowRight, BarChart3, Upload, FileSignature, UserCog, Megaphone } from "lucide-react";
import Link from "next/link";
import { THEME } from "@/lib/theme";

const adminSections = [
  {
    href: "/dashboard/admin/agents",
    title: "Agent Team",
    description: "Manage user access, roles, and assignment logic for your acquisition team.",
    icon: Users,
    color: "indigo",
  },
  {
    href: "/dashboard/admin/users",
    title: "User Management",
    description: "Add, edit, and manage all system users and their permissions.",
    icon: UserCog,
    color: "violet",
  },
  {
    href: "/dashboard/admin/kpis",
    title: "KPI Dashboard",
    description: "View performance metrics, conversion rates, and team analytics.",
    icon: BarChart3,
    color: "blue",
  },
  {
    href: "/dashboard/admin/automations",
    title: "Auto-Pilot",
    description: "Configure AI responses, drip campaigns, and lead routing rules.",
    icon: Bot,
    color: "emerald",
  },
  {
    href: "/dashboard/admin/integrations",
    title: "Connections",
    description: "Manage API keys for Twilio, EzTexting, and external services.",
    icon: Plug,
    color: "amber",
  },
  {
    href: "/dashboard/admin/campaigns",
    title: "Campaign Admin",
    description: "Create and manage marketing campaigns and sequences.",
    icon: Megaphone,
    color: "pink",
  },
  {
    href: "/dashboard/admin/import",
    title: "Import Leads",
    description: "Upload CSV files to bulk import leads into the system.",
    icon: Upload,
    color: "cyan",
  },
  {
    href: "/dashboard/admin/contracts",
    title: "Contracts",
    description: "Manage DocuSign contracts and e-signature workflows.",
    icon: FileSignature,
    color: "rose",
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "hover:border-indigo-500/50" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "hover:border-violet-500/50" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "hover:border-blue-500/50" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "hover:border-emerald-500/50" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "hover:border-amber-500/50" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "hover:border-pink-500/50" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "hover:border-cyan-500/50" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "hover:border-rose-500/50" },
};

export default function AdminPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Administration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure agents, automations, integrations, and system settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {adminSections.map((section) => {
          const colors = colorClasses[section.color];
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`group relative overflow-hidden rounded-2xl border ${THEME.border} ${THEME.surface} p-6 transition-all ${colors.border}`}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-xl ${colors.bg} p-3 ${colors.text}`}>
                  <section.icon size={24} />
                </div>
                <ArrowRight
                  size={20}
                  className={`text-gray-600 transition-transform group-hover:translate-x-1 ${colors.text.replace('text-', 'group-hover:text-')}`}
                />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{section.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}