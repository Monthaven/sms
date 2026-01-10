/**
 * PROPRIETARY AND CONFIDENTIAL
 *
 * SMS Sign-In - Stack Auth Integration
 * Redirects to centralized auth portal at auth.monthavencapital.com
 */
"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    // Redirect to centralized auth portal
    const authUrl = new URL("https://app.monthavencapital.com/signin");
    authUrl.searchParams.set("next", `https://sms.monthavencapital.com${next}`);

    // Small delay to show loading state
    const timer = setTimeout(() => {
      window.location.href = authUrl.toString();
    }, 500);

    return () => clearTimeout(timer);
  }, [next]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050b14] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <Card className="shadow-2xl border-slate-700/50">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Monthaven SMS</h1>
            <p className="text-slate-400 text-sm mt-2">Redirecting to Sign-In...</p>
          </div>

          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              UNIFIED SSO • <span className="text-emerald-500">ACTIVE</span>
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              app.monthavencapital.com
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
