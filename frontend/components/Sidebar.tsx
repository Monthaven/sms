"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import NavButton from "./NavButton";
import ProfileRail from "./ProfileRail"; 
import { NAV_SECTIONS } from "@/lib/navigation"; 
import { THEME } from "@/lib/theme";

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
    <div className={`flex h-full flex-col ${THEME.bg} border-r ${THEME.border} w-72 transition-all duration-300`}>
      {/* Brand Header */}
      <div className="p-8 pb-6">
        <div className="flex items-center gap-3 font-bold text-xl text-white tracking-wide">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-xl shadow-indigo-500/20">
            <MessageSquare size={20} fill="currentColor" />
          </div>
          Monthaven
        </div>
        <div className="mt-2 pl-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Private Console
        </div>
      </div>

      {/* Dynamic Navigation from "The Brain" */}
      <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-4 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {section.label}
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

      {/* User Profile Footer */}
      <div className="mt-auto border-t border-[#1E2538] p-4">
         <ProfileRail />
      </div>
    </div>
  );
}