/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary for the root layout.
 * This catches errors that occur in root layout.tsx.
 * Must provide its own <html> and <body> tags.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#050b14] text-white">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
            <svg 
              className="w-10 h-10 text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
          
          <p className="text-slate-400 mb-6 max-w-md">
            A critical error has occurred. Please try refreshing the page.
          </p>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all border border-slate-700"
            >
              Go Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left max-w-lg">
              <p className="text-xs text-slate-500 uppercase mb-2">Debug Info</p>
              <p className="text-sm text-red-400 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
