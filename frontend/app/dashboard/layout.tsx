/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import FloatingDialer from "@/components/FloatingDialer";
import { TwilioCallProvider } from "@/components/TwilioCallProvider";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { PushPermissionModal } from "@/components/PushPermissionPrompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <TwilioCallProvider>
    <RealtimeProvider>
    <div className="flex h-screen w-full bg-[#050b14] overflow-hidden">
      
      {/* 1. Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-20 md:pb-8 custom-scrollbar">
          {/* Max width container to keep high-res screens looking good */}
          <div className="mx-auto max-w-[1800px] space-y-8 pb-10">
            {children}
          </div>
        </main>

        {/* Subtle vignette effect for depth */}
        <div className="pointer-events-none absolute inset-0 z-50 bg-[radial-gradient(transparent_0%,#050b14_100%)] opacity-40" />
      </div>

      {/* 3. Mobile Bottom Navigation */}
      <BottomNav />

      {/* 4. Floating Dialer - call/SMS with mode toggle */}
      <FloatingDialer />

      {/* 5. Push Notification Permission Modal - shows once on first visit */}
      <PushPermissionModal />
    </div>
    </RealtimeProvider>
    </TwilioCallProvider>
  );
}
