/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React, { useState } from 'react';
import { ChatList } from '@/components/chat/ChatList';

type FilterType = 'all' | 'unread' | 'hot';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
      {/* LEFT: Conversation List */}
      <div className="w-96 flex-shrink-0 flex flex-col glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-white font-semibold tracking-wide">Inbox</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Filter:</span>
            <button 
              onClick={() => setActiveFilter('all')}
              className={`text-[10px] font-bold hover:underline transition-colors ${activeFilter === 'all' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => setActiveFilter('unread')}
              className={`text-[10px] font-bold hover:underline transition-colors ${activeFilter === 'unread' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
            >
              UNREAD
            </button>
            <button 
              onClick={() => setActiveFilter('hot')}
              className={`text-[10px] font-bold hover:underline transition-colors ${activeFilter === 'hot' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
            >
              HOT LEADS
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <ChatList filter={activeFilter} />
        </div>
      </div>

      {/* RIGHT: Chat Window (The page content goes here) */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col relative">
        {children}
      </div>
    </div>
  );
}
