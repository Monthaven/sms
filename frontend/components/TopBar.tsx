"use client";

import React from "react";
import { Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { THEME } from "@/lib/theme";

export default function TopBar() {
  const pathname = usePathname();

  const getTitle = () => {
    const segments = pathname?.split("/").filter(Boolean) || [];
    if (segments.length === 0) return "Dashboard";
    if (segments.length === 1 && segments[0] === "dashboard") return "Overview";
    const lastSegment = segments[segments.length - 1];
    return (
      lastSegment.charAt(0).toUpperCase() +
      lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  return (
    <header
      className={`sticky top-0 z-20 flex h-20 items-center justify-between border-b ${THEME.border} ${THEME.bg} px-8`}
    >
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-white capitalize tracking-tight">
          {getTitle()}
        </h1>
        <p className="text-xs font-medium text-gray-500">
          Monthaven Real Estate Systems
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="group relative hidden md:block">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-indigo-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Global Search..."
            className={`w-80 rounded-xl border border-transparent ${THEME.surface} px-12 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:border-indigo-500/50 focus:outline-none transition-all`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <span className="rounded bg-[#0B0F19] px-1.5 py-0.5 text-[10px] text-gray-600">
              /
            </span>
          </div>
        </div>
        <button className="relative rounded-xl p-2.5 text-gray-500 transition-all hover:bg-[#1E2538] hover:text-white">
          <Bell size={22} />
          <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
        </button>
      </div>
    </header>
  );
}
