'use client';

import React from 'react';
import { ChatList } from '@/components/chat/ChatList';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
      {/* LEFT: Conversation List */}
      <div className="w-96 flex-shrink-0 flex flex-col glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-white font-semibold tracking-wide">Inbox</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Filter:</span>
            <button className="text-[10px] text-blue-400 font-bold hover:underline">ALL</button>
            <button className="text-[10px] text-slate-500 hover:text-white transition-colors">UNREAD</button>
            <button className="text-[10px] text-slate-500 hover:text-white transition-colors">HOT LEADS</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <ChatList />
        </div>
      </div>

      {/* RIGHT: Chat Window (The page content goes here) */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col relative">
        {children}
      </div>
    </div>
  );
}
