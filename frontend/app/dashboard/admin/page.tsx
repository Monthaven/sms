/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import { Users, Bot, Plug, ArrowRight } from "lucide-react";
import Link from "next/link";
import { THEME } from "@/lib/theme"; // Use absolute import with alias

export default function AdminPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Administration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure agents, automations, and integrations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Agents Card */}
        <Link href="/dashboard/admin/agents" className={`group relative overflow-hidden rounded-2xl border ${THEME.border} ${THEME.surface} p-6 transition-all hover:border-indigo-500/50`}>
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
              <Users size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-white">Agent Team</h3>
          <p className="mt-2 text-sm text-gray-400">
            Manage user access, roles, and assignment logic for your acquisition team.
          </p>
        </Link>

        {/* Automations Card */}
        <Link href="/dashboard/admin/automations" className={`group relative overflow-hidden rounded-2xl border ${THEME.border} ${THEME.surface} p-6 transition-all hover:border-emerald-500/50`}>
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Bot size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-white">Auto-Pilot</h3>
          <p className="mt-2 text-sm text-gray-400">
            Configure AI responses, drip campaigns, and lead routing rules.
          </p>
        </Link>

        {/* Integrations Card */}
        <Link href="/dashboard/admin/integrations" className={`group relative overflow-hidden rounded-2xl border ${THEME.border} ${THEME.surface} p-6 transition-all hover:border-amber-500/50`}>
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Plug size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-white">Connections</h3>
          <p className="mt-2 text-sm text-gray-400">
            Manage API keys for Twilio, EzTexting, and Neon CRM connections.
          </p>
        </Link>
      </div>
    </div>
  );
}