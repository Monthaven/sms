/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface NavButtonProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  collapsed?: boolean;
  onClick?: () => void;
}

export default function NavButton({
  href,
  icon: Icon,
  label,
  badge,
  collapsed = false,
  onClick,
}: NavButtonProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  const content = (
    <div
      className={clsx(
        "flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative",
        collapsed ? "justify-center px-2" : "px-4",
        isActive
          ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      {!collapsed && isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]" />
      )}
      <Icon
        size={18}
        className={clsx(
          collapsed ? "" : "mr-3",
          isActive ? "text-blue-400" : "group-hover:text-white"
        )}
      />
      {!collapsed && label}
      {badge !== undefined && badge > 0 && (
        <span
          className={clsx(
            "ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold",
            isActive
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-300"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return <Link href={href}>{content}</Link>;
}