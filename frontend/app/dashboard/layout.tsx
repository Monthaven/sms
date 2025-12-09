import React from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AgentPresence from "@/components/AgentPresence";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B1120] text-slate-100 antialiased selection:bg-indigo-500/30">
      {/* 1. Permanent Sidebar Navigation */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-[#0F1629] md:flex">
        <Sidebar />
        <div className="mt-auto border-t border-white/5 p-4">
          <AgentPresence />
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        <TopBar />
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="mx-auto max-w-7xl space-y-8 pb-20">
            {children}
          </div>
        </div>

        {/* Background Ambient Glows */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[100px]" />
        </div>
      </main>
    </div>
  );
}
