/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import Link from 'next/link';
import { AlertTriangle, LayoutDashboard, Settings, BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050b14] text-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>

      <div className="relative z-10">
        {/* Icon */}
        <div className="w-24 h-24 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-8 border border-rose-500/20 mx-auto shadow-[0_0_40px_rgba(244,63,94,0.15)]">
          <AlertTriangle className="text-rose-500" size={48} />
        </div>

        {/* Error Code */}
        <div className="text-7xl font-mono font-bold text-rose-500/30 mb-2 tracking-tighter">404</div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Resource Not Found</h1>
        
        {/* Description */}
        <p className="text-slate-400 max-w-md mb-10 mx-auto">
          The requested page doesn't exist or has been moved. Select a destination below to continue.
        </p>

        {/* Recovery CTAs */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/20"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link 
            href="/dashboard/admin"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all font-medium"
          >
            <Settings size={18} />
            Admin Panel
          </Link>
          <Link 
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-all font-medium"
          >
            <Home size={18} />
            Home
          </Link>
        </div>

        {/* Help Link */}
        <div className="text-sm text-slate-500">
          Need help? Check the{' '}
          <a href="#" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
            documentation
          </a>
          {' '}or contact support.
        </div>
      </div>
    </div>
  );
}
