import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050b14] text-center p-4">
      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
        <AlertTriangle className="text-rose-500" size={40} />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">System Error 404</h1>
      <p className="text-slate-400 max-w-md mb-8">
        The requested resource is not available on this server. It may have been moved or deleted.
      </p>
      <Link 
        href="/dashboard"
        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all font-medium"
      >
        Return to Command Center
      </Link>
    </div>
  );
}
