"use client";

import React from "react";
import { Settings, LogOut } from "lucide-react";

export default function ProfileRail() {
  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-glass-200 p-3 shadow-glass hover:shadow-neon-blue transition-all">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 font-bold text-gray-300 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
        JD
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-200">
          John Doe
        </p>
        <p className="truncate text-[10px] text-gray-500 transition-colors group-hover:text-gray-400">
          Super Admin
        </p>
      </div>
      <Settings size={16} className="text-gray-600 group-hover:text-white" />
    </div>
  );
}
