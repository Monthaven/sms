/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { logCallOutcomeAction } from "@/app/actions";
import clsx from "clsx";
import type { LeadStatus } from "@prisma/client";
import { Loader2, PhoneCall, X } from "lucide-react";
import { useState, useTransition } from "react";

const OUTCOMES = [
  "Connected - Interested",
  "Connected - Not interested",
  "Left voicemail",
  "No answer",
  "Wrong number",
  "Do not call",
];

const STATUS_OPTIONS: LeadStatus[] = [
  "CONVERSATION_ACTIVE",
  "RESP_HOT",
  "RESP_WARM",
  "RESP_COLD",
  "QUEUED_FOR_CALL",
  "CONVERTED",
  "ARCHIVED",
];

type CallOutcomeModalProps = {
  open: boolean;
  onClose: () => void;
  leadId: string | null;
  leadName?: string;
};

export default function CallOutcomeModal({ open, onClose, leadId, leadName }: CallOutcomeModalProps) {
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<LeadStatus>("CONVERSATION_ACTIVE");
  const [callTime, setCallTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [pending, startTransition] = useTransition();

  if (!open || !leadId) return null;
  const ensuredLeadId = leadId;

  function reset() {
    setOutcome(OUTCOMES[0]);
    setNote("");
    setStatus("CONVERSATION_ACTIVE");
    setCallTime(new Date().toISOString().slice(0, 16));
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await logCallOutcomeAction(ensuredLeadId, {
        outcome,
        note: note.trim() || undefined,
        status,
        calledAt: callTime ? new Date(callTime).toISOString() : undefined,
      });
      reset();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Call Outcome</p>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-300" />
              Log call
            </h2>
            {leadName && <p className="text-sm text-slate-400">{leadName}</p>}
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-white" title="Close" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            Outcome
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            >
              {OUTCOMES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Status Update
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Call Time
            <input
              type="datetime-local"
              value={callTime}
              onChange={(e) => setCallTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="block">
            Notes
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Call recap, objections, next steps…"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="mae-button primary flex-1 text-xs"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save outcome"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className={clsx(
              "mae-button ghost flex-1 text-xs",
              pending && "cursor-not-allowed opacity-70"
            )}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
