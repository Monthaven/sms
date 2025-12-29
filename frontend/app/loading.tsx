/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b14]">
      <div className="flex flex-col items-center">
        {/* Animated Logo/Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Loading Text */}
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
