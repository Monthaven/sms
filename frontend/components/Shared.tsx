import React from 'react';
import { Building2, MapPin } from 'lucide-react';

export type LeadStatus = 'New' | 'Hot' | 'Warm' | 'Cold' | 'DNC' | 'Sold';

export const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    New: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Hot: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
    Warm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Cold: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    DNC: 'bg-gray-800 text-gray-500 border-gray-700',
    Sold: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const defaultStyle = 'bg-gray-800 text-gray-400 border-gray-700';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${styles[status] || defaultStyle}`}>
      {status === 'Hot' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
      {status.toUpperCase()}
    </span>
  );
};

export const TypeBadge = ({ type }: { type: 'Commercial' | 'Residential' }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${type === 'Commercial' ? 'text-indigo-300' : 'text-emerald-300'}`}>
    {type === 'Commercial' ? <Building2 size={10} /> : <MapPin size={10} />}
    {type}
  </span>
);

export const Avatar = ({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };

  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg flex items-center justify-center font-bold`}>
      {initials}
    </div>
  );
};

export default { StatusBadge, TypeBadge, Avatar };
