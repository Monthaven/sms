"use client";

import React from "react";
import { Users, Phone, TrendingUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  iconName?: "Users" | "Phone" | "TrendingUp" | "DollarSign";
  color: string;
  trend: string;
  trendUp: boolean;
  variant?: "default" | "alert" | "status";
}

const ICONS: Record<string, any> = {
  Users,
  Phone,
  TrendingUp,
  DollarSign,
};

export function StatCard({
  label,
  value,
  iconName,
  color,
  trend,
  trendUp,
  variant = "default",
}: StatCardProps) {
  const Icon = iconName ? ICONS[iconName] : Users;

  // Map friendly color names to hex values for inline styling (avoids Tailwind safelist issues)
  const COLOR_MAP: Record<string, string> = {
    indigo: '#6366f1',
    rose: '#fb7185',
    emerald: '#10b981',
    amber: '#f59e0b',
    slate: '#0f172a'
  };

  const hex = COLOR_MAP[color] || color || '#6366f1';
  const glowStyle = { background: hex, filter: 'blur(40px)', opacity: 0.18 } as React.CSSProperties;
  const iconStyle = { color: hex } as React.CSSProperties;

  return (
    <div className={`glass-panel relative overflow-hidden transition-all group`}>
      {/* Dynamic Ambient Glow (using inline style to avoid dynamic Tailwind classes) */}
      <div style={Object.assign({ position: 'absolute', right: '-2.5rem', top: '-2.5rem', height: '8rem', width: '8rem', borderRadius: '9999px', transition: 'opacity 200ms' }, glowStyle)} className="opacity-0 group-hover:opacity-100" />

      <div className="relative z-10 flex items-start justify-between">
        <div className={`rounded-xl p-3 text-white bg-white/5 border border-white/10 ring-1 ring-white/5`}>
          <Icon size={20} style={iconStyle} />
        </div>

        <div className="flex flex-col items-end">
           <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
             trendUp 
               ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
               : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
           }`}>
            {trend}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold text-white tracking-tight font-mono text-glow">
          {value}
        </p>
      </div>
    </div>
  );
}