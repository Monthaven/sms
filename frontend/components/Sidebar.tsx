"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import NavButton from "./NavButton";
import ProfileRail from "./ProfileRail";
import { NAV_SECTIONS } from "../lib/navigation";

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    return path !== "/dashboard" && pathname?.startsWith(path);
  };

  return (
    <div className="flex h-full flex-col w-72 transition-all duration-300 relative">
      {/* Glass Background Layer */}
      <div className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-xl border-r border-white/5 z-0" />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full">
        
        {/* Brand Header */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3 font-bold text-xl text-white tracking-wide">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-30 blur group-hover:opacity-50 transition duration-200" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E2538] border border-white/10 text-white shadow-xl">
                <MessageSquare size={18} className="text-indigo-400" fill="currentColor" />
              </div>
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              Monthaven
            </span>
          </div>
          <div className="mt-3 pl-12 flex items-center gap-2">
            <div className="h-px w-4 bg-indigo-500/50" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80 shadow-indigo-500/50">
              Command v2
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-4 py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="mb-3 px-4 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {section.label}
                </span>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.href} onClick={onItemClick}>
                    <NavButton
                      href={item.href}
                      // @ts-ignore
                      Icon={item.icon}
                      label={item.name}
                      active={isActive(item.href)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-white/5 bg-[#0B0F19]/50 p-4 backdrop-blur-sm">
           <ProfileRail />
        </div>
      </div>
    </div>
  );
}