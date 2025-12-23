/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, LogOut, ChevronDown, User } from "lucide-react";
import clsx from "clsx";

type Role = "ADMIN" | "AGENT" | "CALLER" | "MANAGER" | "INVESTOR";

interface ProfileRailProps {
  collapsed?: boolean;
}

export default function ProfileRail({ collapsed = false }: ProfileRailProps) {
  const [role, setRole] = useState<Role>("AGENT");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const cookies = document.cookie.split(";").map((c) => c.trim());

    const roleCookie = cookies.find((c) => c.startsWith("mae_role="));
    if (roleCookie) {
      const val = roleCookie.split("=")[1] as Role;
      if (["ADMIN", "AGENT", "CALLER", "MANAGER", "INVESTOR"].includes(val)) {
        setRole(val);
      }
    }

    const nameCookie = cookies.find((c) => c.startsWith("mae_name="));
    if (nameCookie) {
      setUserName(decodeURIComponent(nameCookie.split("=")[1]));
    }

    const emailCookie = cookies.find((c) => c.startsWith("mae_email="));
    if (emailCookie) {
      setUserEmail(decodeURIComponent(emailCookie.split("=")[1]));
    }
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const roleColors: Record<Role, string> = {
    ADMIN: "text-rose-400",
    MANAGER: "text-purple-400",
    AGENT: "text-blue-400",
    CALLER: "text-emerald-400",
    INVESTOR: "text-amber-400",
  };

  const handleLogout = async () => {
    document.cookie = "mae_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "mae_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "mae_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className={clsx(
          "flex items-center w-full p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-left group",
          collapsed ? "justify-center" : ""
        )}
      >
        <div
          className={clsx(
            "w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 border border-blue-400/30 overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20",
            collapsed ? "" : "mr-3"
          )}
        >
          {initials || <User size={14} />}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className={clsx("text-[10px] truncate", roleColors[role])}>
                {role}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={clsx(
                "text-slate-500 transition-transform",
                showMenu && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {showMenu && (
        <div
          className={clsx(
            "absolute bottom-full mb-2 rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-lg shadow-xl overflow-hidden z-50",
            collapsed ? "left-0 w-48" : "left-0 right-0"
          )}
        >
          <div className="p-3 border-b border-slate-800">
            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
          </div>
          <div className="p-1">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              onClick={() => setShowMenu(false)}
            >
              <Settings size={14} />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
