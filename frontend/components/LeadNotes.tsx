/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useTransition } from "react";
import { StickyNote, Plus, Clock, Save, Loader2 } from "lucide-react";
import clsx from "clsx";

type Note = {
  id: string;
  text: string;
  createdAt: Date;
  author?: string;
};

type LeadNotesProps = {
  leadId: string;
  initialNotes?: string;
  auditNotes?: Note[];
};

export default function LeadNotes({ leadId, initialNotes, auditNotes = [] }: LeadNotesProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setIsEditing(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Notes</h3>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Note
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this lead..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none resize-none"
          rows={3}
        />
      ) : notes ? (
        <div 
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-white/8 transition"
        >
          {notes}
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-slate-500 cursor-pointer hover:border-white/20 transition text-center"
        >
          Click to add notes...
        </div>
      )}

      {/* Audit trail / history */}
      {auditNotes.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Activity Log</div>
          {auditNotes.slice(0, 5).map((note) => (
            <div key={note.id} className="flex items-start gap-2 text-xs">
              <Clock className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400">{note.text}</span>
                <span className="text-slate-600 ml-2">
                  {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
