/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { Inbox } from 'lucide-react';

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
      <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-6 rotate-12">
        <Inbox size={40} className="text-slate-500" />
      </div>
      <h3 className="text-xl font-semibold text-white">Select a Conversation</h3>
      <p className="text-slate-400 max-w-xs mt-2 text-sm">
        Choose a lead from the left to start viewing the secure message history.
      </p>
    </div>
  );
}
