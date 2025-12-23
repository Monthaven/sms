/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import React from 'react';
import { sendReplyAction } from '@/app/actions';

interface ChatInputProps {
  leadId: string;
  onSent?: () => void;
}

export function ChatInput({ leadId, onSent }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || pending) return;

    setError(null);
    const formData = new FormData();
    formData.set('leadId', leadId);
    formData.set('message', message.trim());

    startTransition(async () => {
      const result = await sendReplyAction({ success: false, error: '' }, formData);
      if (result.success) {
        setMessage('');
        onSent?.();
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-900/30 backdrop-blur-md border-t border-slate-700/50">
      {error && (
        <div className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
          {error}
        </div>
      )}
      <div className="relative flex items-end gap-2 bg-slate-800/50 border border-slate-700 rounded-xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
        
        <button type="button" className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700" title="Attach file" aria-label="Attach file">
          <Paperclip size={18} />
        </button>
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-500 min-h-[44px] max-h-32 resize-none py-3"
          rows={1}
          disabled={pending}
        />
        
        <div className="flex items-center gap-1 pb-1">
           <button type="button" className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700" title="Add emoji" aria-label="Add emoji">
             <Smile size={18} />
           </button>
           <button 
             type="submit"
             disabled={!message.trim() || pending}
             className={`p-2 rounded-lg transition-all duration-300 ${
               message.trim() && !pending
                 ? 'bg-blue-600 text-white shadow-[0_0_10px_#2563eb] hover:bg-blue-500' 
                 : 'bg-slate-700 text-slate-500 cursor-not-allowed'
             }`}
           >
             {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
           </button>
        </div>
      </div>
    </form>
  );
}
