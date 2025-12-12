'use client';

import React from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { Phone, Clock } from 'lucide-react';
import LeadStatusBadge from '@/components/LeadStatusBadge';

export default function QueuePage() {
  const { leads = [], isLoading } = useLeads({ statuses: ["QUEUED_FOR_CALL"] });

  const queueLeads = leads ?? [];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Call Queue</h2>
          <p className="text-slate-400 text-sm">
            <span className="text-emerald-400 font-bold">{queueLeads.length}</span> leads waiting for contact.
          </p>
        </div>
        
        <div className="flex gap-2">
           <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 flex items-center gap-2 text-sm text-slate-300">
              <Clock size={14} className="text-blue-400" />
              <span>Est. Time: 45m</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {isLoading && (
          <div className="text-slate-500 animate-pulse">Loading queue...</div>
        )}
        {!isLoading && queueLeads.length === 0 && (
          <div className="text-slate-500 text-sm">No leads queued for calls right now.</div>
        )}
        {!isLoading && queueLeads.map((lead: any, index: number) => (
          <div 
            key={lead.id || index} 
            className="group flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm border border-slate-700">
                {index + 1}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium text-lg">
                    {lead.contact?.firstName} {lead.contact?.lastName}
                  </h3>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{lead.property?.addressLine1 || "No Address Provided"}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {lead.createdAt ? `Created ${new Date(lead.createdAt).toLocaleString()}` : "Recently added"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden group-hover:flex items-center gap-2 mr-4 transition-all">
                  <button className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-medium">No Answer</button>
                  <button className="px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium">Booked</button>
               </div>

               <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white pl-3 pr-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                 <Phone size={16} />
                 <span className="font-medium text-sm">Call</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
