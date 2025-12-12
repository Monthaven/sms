'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Set a simple session cookie so middleware passes (mock auth)
    document.cookie = "mae_user=mock_user; path=/; max-age=86400; SameSite=Lax";

    // Redirect after a brief delay
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh(); // Forces the middleware to re-run and see the cookie
    }, 1000);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#050b14] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <Card className="shadow-2xl border-slate-700/50">
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Monthaven</h1>
            <p className="text-slate-400 text-sm mt-2">Secure Access Gateway</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agent ID</label>
              <input 
                type="email" 
                defaultValue="admin@monthaven.com"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passkey</label>
              <input 
                type="password" 
                defaultValue="password"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <Button disabled={loading} className="w-full mt-2" icon={!loading ? <ChevronRight size={16} /> : undefined}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Authenticate"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              SYSTEM STATUS: <span className="text-emerald-500">OPERATIONAL</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
