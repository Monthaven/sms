/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Phone, ListTodo, Clock, Home, LogOut } from "lucide-react";
import Image from "next/image";

const callerNavItems = [
  { name: "Lead Queue", href: "/sms/queue", icon: ListTodo },
  { name: "Dialer", href: "/sms/dial", icon: Phone },
  { name: "Callbacks", href: "/sms/callbacks", icon: Clock },
];

export default function SMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = "mae_session=; path=/; max-age=0";
    document.cookie = "mae_role=; path=/; max-age=0";
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen w-full bg-[#050b14] overflow-hidden">
      
      {/* Compact Sidebar for Callers */}
      <aside className="hidden md:flex w-20 bg-[#0B1120]/95 backdrop-blur-xl border-r border-slate-800 flex-col h-screen flex-shrink-0">
        
        {/* Logo */}
        <div className="p-4 flex justify-center">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <Image
              src="/white-logo.svg"
              alt="Monthaven"
              fill
              className="p-1 drop-shadow-[0_0_14px_rgba(59,130,246,0.6)] object-contain"
            />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-2 py-4">
          {callerNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 p-3 rounded-xl transition-all w-16 group",
                  isActive
                    ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                    : "text-slate-500 hover:text-white hover:bg-slate-800/50"
                )}
                title={item.name}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.name.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-2 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 p-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all group"
            title="Back to Dashboard"
          >
            <Home size={18} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full group"
            title="Log Out"
          >
            <LogOut size={18} />
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Caller Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-slate-800 bg-[#0B1120]/80 backdrop-blur-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden relative w-8 h-8">
              <Image
                src="/white-logo.svg"
                alt="Monthaven"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Caller Station</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dialer Mode</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 md:pb-6 custom-scrollbar">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav for Callers */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-2 pb-safe shadow-2xl z-50">
        {callerNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex h-full w-full flex-col items-center justify-center space-y-1 transition-colors relative",
                isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.name.split(" ")[0]}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
              )}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className="flex h-full w-full flex-col items-center justify-center space-y-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
      </nav>
    </div>
  );
}
