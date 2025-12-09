"use client";

import Link from "next/link";
import React from "react";
import type { LucideIcon } from "lucide-react";

interface NavButtonProps {
  href: string;
  label: string;
  Icon: LucideIcon;
  active?: boolean;
}

export default function NavButton({ href, label, Icon, active }: NavButtonProps) {
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-sm font-medium border border-transparent";
  const activeClasses =
    "bg-[#1E2538] text-white border-[#2A3449] shadow-lg shadow-black/20";
  const inactiveClasses =
    "text-gray-500 hover:text-gray-200 hover:bg-[#151B2D]";

  return (
    <Link href={href} className={`${baseClasses} ${active ? activeClasses : inactiveClasses} w-full`}>
      <Icon size={18} className={active ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"} />
      <span>{label}</span>
    </Link>
  );
}
