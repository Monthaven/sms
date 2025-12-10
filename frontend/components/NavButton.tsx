"use client";

import Link from "next/link";
import React from "react";
import type { LucideIcon } from "lucide-react";

interface NavButtonProps {
  href: string;
  label: string;
  Icon: LucideIcon | React.ComponentType<any>;
  active?: boolean;
}

export default function NavButton({ href, label, Icon, active }: NavButtonProps) {
  return (
    <Link href={href} className="block w-full group/nav">
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${
          active
            ? "bg-gradient-to-r from-indigo-500/10 to-transparent border-indigo-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
            : "border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
        }`}
      >
        {/* Active Indicator (Left Bar) */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
        )}

        <Icon
          size={18}
          className={`transition-all duration-300 ${
            active 
              ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
              : "text-slate-500 group-hover/nav:text-slate-300"
          }`}
        />
        
        <span className={`text-sm font-medium tracking-wide transition-colors ${
          active ? "text-white" : ""
        }`}>
          {label}
        </span>

        {/* Hover Shine Effect (Subtle) */}
        {!active && (
          <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover/nav:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>
    </Link>
  );
}