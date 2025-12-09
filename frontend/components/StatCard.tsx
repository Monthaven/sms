"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend: string;
  trendUp: boolean;
  variant?: "default" | "alert" | "status";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  trendUp,
  variant = "default",
}: StatCardProps) {
  
  // Base glass style
  const baseStyle = "relative overflow-hidden rounded-2xl border border-[#2A3449] bg-[#151B2D] p-6 transition-all hover:border-gray-700";
  
  // Variant styles
  const variants = {
    default: baseStyle,
    alert: "relative overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 shadow-[0_0_30px_rgba(244,63,94,0.1)]",
    status: "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:border-emerald-500/50 transition-colors"
  };

  return (
    <div className={variants[variant]}>
      {/* Background Glow Effect */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-opacity-10 blur-3xl ${color} opacity-0 transition-opacity group-hover:opacity-100`} />

      <div className="relative z-10 flex items-start justify-between">
        <div className={`rounded-xl bg-opacity-10 p-3.5 text-white ${color.replace('bg-', 'bg-').replace('500', '500/10')}`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
        
        <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
          variant === 'status' ? 'bg-emerald-500/10 text-emerald-400' :
          trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {variant === 'status' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"/>}
          {trend}
        </span>
      </div>

      <div className="relative z-10 mt-5">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold text-white tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}