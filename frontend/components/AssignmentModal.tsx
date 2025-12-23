/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { assignLeadAction } from "@/app/actions";
import { useAgents } from "@/lib/hooks/useAgents";
import clsx from "clsx";
import { Loader2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type AssignmentModalProps = {
  leadId: string;
  open: boolean;
  onClose: () => void;
};

const SLA_OPTIONS = [15, 30, 60, 120];

export default function AssignmentModal({ leadId, open, onClose }: AssignmentModalProps) {
  const { data: agents, isLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [slaMinutes, setSlaMinutes] = useState<number>(30);
  const [pending, startTransition] = useTransition();

  const agentOptions = useMemo(() => agents ?? [], [agents]);

  function resetState() {
    setNote("");
    setSlaMinutes(30);
    setSelectedAgent(null);
  }

  function handleClose() {
    if (pending) return;
    resetState();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgent) return;

    startTransition(async () => {
      await assignLeadAction(leadId, selectedAgent, {
        note: note.trim() || undefined,
        slaMinutes,
      });
      resetState();
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Assignment</p>
            <h2 className="text-2xl font-semibold text-white">Route lead</h2>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-white" title="Close" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            Agent
            <select
              value={selectedAgent ?? ""}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={isLoading || pending}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              required
            >
              <option value="" disabled>
                {isLoading ? "Loading agents…" : "Select agent"}
              </option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.status.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-300">
            SLA (minutes)
            <div className="mt-2 flex flex-wrap gap-2">
              {SLA_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSlaMinutes(option)}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.2em]",
                    slaMinutes === option
                      ? "border-sky-400/60 bg-sky-500/10 text-sky-100"
                      : "border-white/15 text-slate-300 hover:border-sky-400/40"
                  )}
                >
                  {option}m
                </button>
              ))}
            </div>
          </label>

          <label className="block text-sm text-slate-300">
            Notes
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Context, next steps, reminders…"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={pending || !selectedAgent}
            className="mae-button primary flex-1 text-xs"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign lead"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="mae-button ghost flex-1 text-xs"
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
