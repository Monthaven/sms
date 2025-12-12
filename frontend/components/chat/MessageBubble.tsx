'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface MessageProps {
  content: string;
  isOutbound: boolean; // True = Agent sent it, False = Lead sent it
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export function MessageBubble({ content, isOutbound, timestamp, status }: MessageProps) {
  return (
    <div className={clsx("flex w-full mb-4", isOutbound ? "justify-end" : "justify-start")}>
      <div className={clsx(
        "max-w-[70%] p-3 rounded-2xl text-sm relative group transition-all duration-300",
        isOutbound 
          ? "bg-blue-600 text-white rounded-br-none shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
          : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50"
      )}>
        <p className="leading-relaxed">{content}</p>
        
        <div className={clsx(
          "flex items-center gap-1 text-[10px] mt-1 opacity-60 group-hover:opacity-100 transition-opacity",
          isOutbound ? "justify-end text-blue-100" : "justify-start text-slate-400"
        )}>
          <span>{timestamp}</span>
          {isOutbound && (
            <span>
              <Check size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
