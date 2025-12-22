/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import clsx from 'clsx';

const STATUS_STYLES: Record<string, string> = {
  RESP_HOT: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
  RESP_WARM: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  RESP_COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DNC: "bg-slate-700/30 text-slate-400 border-slate-600/30",
  SOLD: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  NEW: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

interface Props {
  status: string;
  className?: string;
}

export default function LeadStatusBadge({ status, className }: Props) {
  const style = STATUS_STYLES[status] || "bg-slate-800 text-slate-400 border-slate-700";
  
  return (
    <span className={clsx(
      "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm transition-all",
      style,
      className
    )}>
      {status.replace('RESP_', '')}
    </span>
  );
}
