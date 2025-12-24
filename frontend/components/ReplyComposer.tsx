/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useEffect, useState, useTransition } from "react";
import { sendReplyAction } from "@/app/actions";
import { Loader2, Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

type MacroTemplate = {
  id: string;
  label: string;
  body: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type SMSProvider = "twilio" | "eztexting";

const defaultMacros: MacroTemplate[] = [
  {
    id: "confirm-interest",
    label: "Confirm interest",
    body: "Appreciate the reply. Are you open to reviewing a written offer if we can align with your pricing expectations?",
  },
  {
    id: "schedule-call",
    label: "Schedule call",
    body: "Happy to hop on a quick call to cover condition, rents, and timing. Does later today or tomorrow morning work?",
  },
  {
    id: "handoff",
    label: "Handoff",
    body: "Looping in our acquisitions partner now so we can finalize numbers. Expect a follow-up text shortly.",
  },
];

export default function ReplyComposer({
  leadId,
  macros = defaultMacros,
}: {
  leadId: string;
  macros?: MacroTemplate[];
}) {
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [showMacros, setShowMacros] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [provider, setProvider] = useState<SMSProvider>("twilio");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function insertMacro(body: string) {
    setMessage(body);
    setShowMacros(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!message.trim()) {
      setToast({ type: "error", message: "Please enter a message" });
      return;
    }

    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("message", message.trim());
    formData.set("provider", provider);

    startTransition(async () => {
      const result = await sendReplyAction({ success: false, error: "" }, formData);
      if (result.success) {
        setMessage("");
        setToast({ type: "success", message: "Message sent!" });
      } else {
        setToast({ type: "error", message: result.error || "Failed to send" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Quick Reply
          </label>
          {/* Provider Toggle */}
          <div className="flex rounded-md border border-white/10 overflow-hidden text-[10px]">
            <button
              type="button"
              onClick={() => setProvider("twilio")}
              className={clsx(
                "px-2 py-0.5 transition",
                provider === "twilio"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-500 hover:bg-white/5"
              )}
            >
              Twilio
            </button>
            <button
              type="button"
              onClick={() => setProvider("eztexting")}
              className={clsx(
                "px-2 py-0.5 transition",
                provider === "eztexting"
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-500 hover:bg-white/5"
              )}
            >
              EzTexting
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMacros(!showMacros)}
          className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300"
        >
          <Sparkles size={12} />
          Templates
          {showMacros ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showMacros && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {macros.map((macro) => (
            <button
              key={macro.id}
              type="button"
              onClick={() => insertMacro(macro.body)}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-[10px] text-slate-300 hover:border-sky-400/30 hover:bg-slate-800 transition-colors"
            >
              {macro.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a reply..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Send
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-lg px-3 py-1.5 text-xs ${
            toast.type === "success"
              ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : "border border-rose-400/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </form>
  );
}
