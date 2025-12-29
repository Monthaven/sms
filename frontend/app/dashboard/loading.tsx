/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0f1a] min-h-[60vh]">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Loading Text */}
        <p className="mt-4 text-slate-500 text-sm">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
