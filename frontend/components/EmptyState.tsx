/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import { MessageSquare, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-4 rounded-full bg-white/5 p-6 ring-1 ring-white/10">
        <MessageSquare className="h-10 w-10 text-slate-600" />
      </div>
      <h4 className="text-lg font-medium text-white">{title}</h4>
      <p className="max-w-xs text-sm text-slate-500 mt-2">
        {description}
      </p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[#1E2538] px-4 py-2 text-sm font-medium text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/25 border border-[#2A3449]"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}