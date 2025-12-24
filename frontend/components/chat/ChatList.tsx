/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import { useLeads } from '@/lib/hooks/useLeads';
import { Lead } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageSquare } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';

type FilterType = 'all' | 'unread' | 'hot';

interface ChatListProps {
  filter?: FilterType;
}

export function ChatList({ filter = 'all' }: ChatListProps) {
  const { leads, isLoading } = useLeads();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = useMemo(() => {
    let result: Lead[] = leads || [];
    
    // Apply type filter
    if (filter === 'unread') {
      result = result.filter((lead: Lead) => 
        lead.status === 'RESP_HOT' || 
        lead.status === 'RESP_WARM' || 
        lead.status === 'CONVERSATION_ACTIVE'
      );
    } else if (filter === 'hot') {
      result = result.filter((lead: Lead) => lead.status === 'RESP_HOT');
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((lead: Lead) => {
        const name = `${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.toLowerCase();
        const phone = lead.contact?.phoneE164?.toLowerCase() || '';
        const address = lead.property?.addressLine1?.toLowerCase() || '';
        const lastMsg = lead.contact?.interactions?.[lead.contact.interactions.length - 1]?.body?.toLowerCase() || '';
        return name.includes(q) || phone.includes(q) || address.includes(q) || lastMsg.includes(q);
      });
    }
    
    return result;
  }, [leads, searchQuery, filter]);

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
        <span className="text-slate-500 text-sm">Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search within Inbox */}
      <div className="px-4 py-2 relative">
         <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
         <input 
           type="text" 
           placeholder="Search leads..." 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
         />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <MessageSquare className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 text-center">
              {searchQuery 
                ? 'No leads match your search' 
                : filter === 'hot' 
                  ? 'No hot leads right now' 
                  : filter === 'unread' 
                    ? 'All caught up!' 
                    : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead: Lead) => {
          const isActive = pathname?.includes(lead.id);
          // Get actual last message from interactions
          const lastInteraction = lead.contact?.interactions?.[lead.contact.interactions.length - 1];
          const lastMessage = lastInteraction?.body || "No messages yet";
          const isUnread = lead.status === 'RESP_HOT' || lead.status === 'RESP_WARM'; 
          const isHot = lead.status === 'RESP_HOT';

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
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${isActive ? 'text-blue-200' : 'text-slate-200'}`}>
                     {lead.contact?.firstName} {lead.contact?.lastName}
                  </span>
                  {isHot && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      HOT
                    </span>
                  )}
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
        })
        )}
      </div>
    </div>
  );
}
