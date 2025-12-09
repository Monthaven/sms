"use client";

import Link from "next/link";
import React from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface NavButtonProps {
  href: string;
  label: string;
  Icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

export default function NavButton({ href, label, Icon, active, onClick }: NavButtonProps) {
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-sm font-medium border border-transparent";
  const activeClasses =
    "bg-[#1E2538] text-white border-[#2A3449] shadow-lg shadow-black/20";
  const inactiveClasses =
    "text-gray-500 hover:text-gray-200 hover:bg-[#151B2D]";

  return (
    <Link href={href} onClick={onClick} className={`${baseClasses} ${active ? activeClasses : inactiveClasses} w-full`}>
      <motion.div whileHover={{ x: 6 }} whileTap={{ scale: 0.98 }} className="flex w-full items-center">
        <Icon size={18} className={active ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"} />
        <span>{label}</span>
      </motion.div>
    </Link>
  );
}
