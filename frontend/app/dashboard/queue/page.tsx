/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeads } from '@/lib/hooks/useLeads';
import { Phone, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import EmptyState from '@/components/EmptyState';
import { updateLeadStatus } from '@/app/actions';

export default function QueuePage() {
  const router = useRouter();
  const { leads = [], isLoading } = useLeads({ statuses: ["QUEUED_FOR_CALL"] });
  const [processingId, setProcessingId] = useState<string | null>(null);

  const queueLeads = leads ?? [];
  const refreshList = () => {
    router.refresh();
  };

  const handleCall = (leadId: string) => {
    router.push(`/sms/dial/${leadId}`);
  };

  const handleNoAnswer = async (leadId: string) => {
    setProcessingId(leadId);
    try {
      await updateLeadStatus(leadId, 'NO_ANSWER' as any);
      refreshList();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBooked = async (leadId: string) => {
    setProcessingId(leadId);
    try {
      await updateLeadStatus(leadId, 'APPOINTMENT_SET' as any);
      refreshList();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    refreshList();
  };

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
           <button
             onClick={handleRefresh}
             disabled={isLoading}
             className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 flex items-center gap-2 text-sm text-slate-300 hover:border-blue-500/30 hover:bg-slate-800/50 transition-colors disabled:opacity-50"
           >
              <RefreshCw size={14} className={`text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
           </button>
           <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 flex items-center gap-2 text-sm text-slate-300">
              <Clock size={14} className="text-blue-400" />
              <span>Est. Time: {Math.ceil(queueLeads.length * 5)}m</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {isLoading && queueLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            <span className="text-slate-500 text-sm">Loading queue...</span>
          </div>
        )}
        {!isLoading && queueLeads.length === 0 && (
          <EmptyState
            title="Queue is Empty"
            description="No leads are queued for calls right now. New hot leads will appear here automatically."
            actionLabel="Go to Inbox"
            onAction={() => router.push('/dashboard/inbox')}
          />
        )}
        {queueLeads.map((lead: any, index: number) => (
          <div 
            key={lead.id || index} 
            className={`group flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-blue-500/30 transition-all duration-300 ${processingId === lead.id ? 'opacity-50' : ''}`}
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
                  <span className="font-mono">{lead.contact?.phoneE164}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {lead.createdAt ? `Created ${new Date(lead.createdAt).toLocaleDateString()}` : "Recently added"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden group-hover:flex items-center gap-2 mr-4 transition-all">
                  <button 
                    onClick={() => handleNoAnswer(lead.id)}
                    disabled={processingId === lead.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-medium disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    No Answer
                  </button>
                  <button 
                    onClick={() => handleBooked(lead.id)}
                    disabled={processingId === lead.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium disabled:opacity-50"
                  >
                    <CheckCircle size={12} />
                    Booked
                  </button>
               </div>

               <button 
                 onClick={() => handleCall(lead.id)}
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white pl-3 pr-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)]"
               >
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
