/**
 * PROPRIETARY — Always Improving LLC
 * Live Dashboard Page for Managers
 */

"use client";

import { LiveCallDashboard } from "@/components/dashboard/LiveCallDashboard";

export default function LiveDashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Dashboard</h1>
        <p className="text-gray-500">Real-time view of agent activity and calls</p>
      </div>
      
      <LiveCallDashboard />
    </div>
  );
}
