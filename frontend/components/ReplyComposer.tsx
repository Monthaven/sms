"use client";

import { sendReplyAction } from "@/app/actions";
import { Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

const initialState = {
  success: false,
  error: "",
};

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

export default function ReplyComposer({ leadId }: { leadId: string }) {
  const [message, setMessage] = useState("");
  const [state, formAction] = useFormState(sendReplyAction, initialState);

  useEffect(() => {
    if (state?.success) {
      setMessage("");
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Send Reply</label>
      <textarea
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        placeholder="Craft an authentic response and send via EzTexting."
        className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
      />
      {state?.error && (
        <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
          {state.error}
        </p>
      )}
      {state?.success && !state.error && (
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-100">
          Reply queued via EzTexting simulator.
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
