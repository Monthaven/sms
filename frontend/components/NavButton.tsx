"use client";

import Link from "next/link";
import React from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface NavButtonProps {
  href: string;
  label: string;
  Icon: LucideIcon | React.ComponentType<any>;
  active?: boolean;
}

export default function NavButton({ href, label, Icon, active }: NavButtonProps) {
  return (
    <Link href={href} className="block w-full">
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group border ${
          active
            ? "bg-[#1E2538] text-white border-[#2A3449] shadow-lg shadow-black/20"
            : "border-transparent text-gray-500 hover:text-gray-200 hover:bg-[#151B2D]"
        }`}
      >
        <Icon
          size={18}
          className={`transition-colors ${
            active ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"
          }`}
        />
        <span className="text-sm font-medium tracking-wide">{label}</span>
        
        {/* Active State Indicator Line */}
        {active && (
          <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
        )}
      </div>
    </Link>
  );
}
