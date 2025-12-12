"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#050b14] overflow-hidden">
      
      {/* 1. Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scrollbar">
          {/* Max width container to keep high-res screens looking good */}
          <div className="mx-auto max-w-[1800px] space-y-8 pb-10">
            {children}
          </div>
        </main>

        {/* Subtle vignette effect for depth */}
        <div className="pointer-events-none absolute inset-0 z-50 bg-[radial-gradient(transparent_0%,#050b14_100%)] opacity-40" />
      </div>
    </div>
  );
}
