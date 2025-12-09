"use client";

import React, { useState } from "react";
import { Search, Bell, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { THEME } from "@/lib/theme";
import { getPageTitle } from "@/lib/navigation";
import Sidebar from "@/components/Sidebar";

export default function TopBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { section, title } = getPageTitle(pathname);

  return (
    <header
      className={`sticky top-0 z-20 flex h-20 items-center justify-between border-b ${THEME.border} ${THEME.bg} px-8`}
    >
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-white capitalize tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-gray-500">{section}</p>
          <span className="text-xs text-gray-600">/</span>
          <p className="text-xs font-medium text-gray-500">Monthaven Real Estate Systems</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden rounded-lg p-2 text-gray-300 hover:bg-[#151B2D]"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="group relative hidden md:block">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-indigo-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Global Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") console.log("Search submit:", searchValue);
            }}
            className={`w-80 rounded-xl border border-transparent ${THEME.surface} px-12 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:border-indigo-500/50 focus:outline-none transition-all focus:ring-2 focus:ring-indigo-500/30`}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-72 max-w-full bg-[#081021]">
            <div className="flex items-center justify-between p-4 border-b border-[#1E2538]">
              <div className="flex items-center gap-3 font-bold text-lg text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white">
                  M
                </div>
                Menu
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded p-2 text-gray-300 hover:bg-[#151B2D]">
                <X />
              </button>
            </div>
            <div className="p-4">
              <Sidebar onItemClick={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
