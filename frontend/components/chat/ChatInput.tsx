'use client';
import { Send, Paperclip, Image as ImageIcon, Smile } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

export function ChatInput() {
  const [message, setMessage] = useState('');

  return (
    <div className="p-4 bg-slate-900/30 backdrop-blur-md border-t border-slate-700/50">
      <div className="relative flex items-end gap-2 bg-slate-800/50 border border-slate-700 rounded-xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
        
        <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
          <Paperclip size={18} />
        </button>
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-500 min-h-[44px] max-h-32 resize-none py-3"
          rows={1}
        />
        
        <div className="flex items-center gap-1 pb-1">
           <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
             <Smile size={18} />
           </button>
           <button 
             className={`p-2 rounded-lg transition-all duration-300 ${
               message.trim() 
                 ? 'bg-blue-600 text-white shadow-[0_0_10px_#2563eb]' 
                 : 'bg-slate-700 text-slate-500'
             }`}
           >
             <Send size={18} />
           </button>
        </div>
      </div>
    </div>
  );
}
