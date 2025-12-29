/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RefreshCw, Home, LayoutDashboard } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application Error:', error);
    
    // In production, you might want to send to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050b14] text-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>

      <div className="relative z-10 max-w-lg">
        {/* Icon */}
        <div className="w-24 h-24 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-8 border border-orange-500/20 mx-auto shadow-[0_0_40px_rgba(249,115,22,0.15)]">
          <AlertOctagon className="text-orange-500" size={48} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Something went wrong</h1>
        
        {/* Description */}
        <p className="text-slate-400 mb-4">
          An unexpected error occurred. Our team has been notified and is working on a fix.
        </p>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Error Details</p>
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-slate-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/20"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all font-medium"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link 
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all font-medium"
          >
            <Home size={18} />
            Home
          </Link>
        </div>

        {/* Support Info */}
        <p className="text-xs text-slate-600">
          If this problem persists, please contact support with error ID:{' '}
          <code className="text-slate-500">{error.digest || 'unknown'}</code>
        </p>
      </div>
    </div>
  );
}
