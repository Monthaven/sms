'use client';

import React from 'react';
import { Lock, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from './actions';

const initialState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} className="w-full mt-2" icon={!pending ? <ChevronRight size={16} /> : undefined}>
      {pending ? <Loader2 className="animate-spin" size={18} /> : "Authenticate"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

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

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agent Email</label>
              <input 
                name="email"
                type="email" 
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passkey</label>
              <input 
                name="passkey"
                type="password" 
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {state?.error && (
              <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                {state.error}
              </div>
            )}

            <SubmitButton />
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
