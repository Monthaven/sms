'use client';

import { useLeads } from '@/lib/hooks/useLeads';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';
import React from 'react';

export function ChatList() {
  const { leads, isLoading } = useLeads();
  const pathname = usePathname();

  if (isLoading) return <div className="p-4 text-slate-500 text-sm">Loading conversations...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Search within Inbox */}
      <div className="px-4 py-2 relative">
         <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
         <input 
           type="text" 
           placeholder="Search leads..." 
           className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
         />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {leads.map((lead: any) => {
          const isActive = pathname?.includes(lead.id);
          // Get actual last message from interactions
          const lastInteraction = lead.contact?.interactions?.[lead.contact.interactions.length - 1];
          const lastMessage = lastInteraction?.body || "No messages yet";
          const isUnread = lead.status === 'RESP_HOT' || lead.status === 'RESP_WARM'; 

          return (
            <Link 
              key={lead.id} 
              href={`/dashboard/chat/${lead.id}`}
              className={`block p-3 rounded-xl transition-all duration-200 border ${
                isActive 
                  ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'bg-transparent border-transparent hover:bg-slate-800/40 hover:border-slate-700/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className={`font-medium text-sm ${isActive ? 'text-blue-200' : 'text-slate-200'}`}>
                   {lead.contact?.firstName} {lead.contact?.lastName}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: false })}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <p className={`text-xs truncate max-w-[80%] ${isUnread ? 'text-white font-medium' : 'text-slate-500'}`}>
                  {lastMessage}
                </p>
                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
