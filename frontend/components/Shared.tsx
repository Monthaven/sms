/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import React from "react";

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
  };

  return (
    <div className={`flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 font-bold text-indigo-300 border border-indigo-500/30 ${sizeClasses[size]}`}>
      {initials}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    HOT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    WARM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    COLD: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const defaultStyle = "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
}