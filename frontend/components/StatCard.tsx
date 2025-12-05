import React from "react";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { THEME } from "@/lib/theme";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
}: StatCardProps) {
  const iconColorClass = color.replace("bg-", "text-");
  const glowColorClass = color.replace("bg-", "bg-opacity-10 bg-");

  return (
    <div
      className={`${THEME.surface} group relative overflow-hidden rounded-2xl border ${THEME.border} p-6 transition-all hover:border-gray-700`}
    >
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${glowColorClass} blur-3xl opacity-0 transition-opacity group-hover:opacity-100`}
      />
      <div className="relative z-10 flex items-start justify-between">
        <div className={`rounded-xl ${color} bg-opacity-10 p-3.5 text-white`}>
          <Icon size={24} className={iconColorClass} />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
              trendUp
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {trend}
          </span>
        )}
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
