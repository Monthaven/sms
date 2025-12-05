"use client";

import { sendReplyAction } from "@/app/actions";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

const initialState = {
  success: false,
  error: "",
};

type MacroTemplate = {
  id: string;
  label: string;
  body: string;
  description?: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-5 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <MessageCircle className="h-4 w-4" />
          Send reply
        </>
      )}
    </button>
  );
}

export default function ReplyComposer({
  leadId,
  macros,
}: {
  leadId: string;
  macros?: MacroTemplate[];
}) {
  const [message, setMessage] = useState("");
  const [state, formAction] = useFormState(sendReplyAction, initialState);
  const [toast, setToast] = useState<ToastState>(null);

  const macroTemplates = useMemo<MacroTemplate[]>(() => {
    if (macros && macros.length > 0) return macros;
    return [
      {
        id: "confirm-interest",
        label: "Confirm interest",
        body:
          "Appreciate the reply. Are you open to reviewing a written offer if we can align with your pricing expectations?",
        description: "Warm tone, keeps the thread conversational.",
      },
      {
        id: "schedule-call",
        label: "Schedule quick call",
        body:
          "Happy to hop on a quick call to cover condition, rents, and timing. Does later today or tomorrow morning work?",
      },
      {
        id: "handoff",
        label: "Handoff to closer",
        body:
          "Looping in our acquisitions partner now so we can finalize numbers. Expect a follow-up text shortly with more detail.",
      },
    ];
  }, [macros]);

  useEffect(() => {
    if (state?.success) {
      setMessage("");
      setToast({
        type: "success",
        message: "Reply queued via EzTexting simulator.",
      });
    } else if (state?.error) {
      setToast({
        type: "error",
        message: state.error,
      });
    }
  }, [state?.success, state?.error]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function insertMacro(body: string) {
    setMessage((prev) => {
      if (!prev) return body;
      return `${prev.trim()}\n\n${body}`;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
        Send Reply
      </label>
      <textarea
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        placeholder="Craft an authentic response and send via EzTexting."
        className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
      />
      <MacroSelector macros={macroTemplates} onInsert={insertMacro} />
      <SubmitButton />
      {toast && (
        <div
          className={`rounded-2xl border px-4 py-2 text-xs ${
            toast.type === "success"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {toast.message}
        </div>
      )}
    </form>
  );
}

function MacroSelector({
  macros,
  onInsert,
}: {
  macros: MacroTemplate[];
  onInsert: (body: string) => void;
}) {
  if (!macros || macros.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
        Quick templates
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {macros.map((macro) => (
          <button
            key={macro.id}
            type="button"
            onClick={() => onInsert(macro.body)}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-xs text-slate-200 transition hover:border-sky-400/30 hover:bg-slate-900/40"
          >
            <Sparkles className="h-4 w-4 flex-shrink-0 text-sky-300" />
            <div>
              <p className="font-semibold text-white">{macro.label}</p>
              {macro.description && (
                <p className="text-[11px] text-slate-500">
                  {macro.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
