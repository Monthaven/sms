"use client";

import { loginAction } from "@/app/actions";
import { Mail, Loader2, Shield } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import clsx from "clsx";

const initialState = {
  error: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500/90",
        "px-4 py-3 text-sm font-semibold text-white tracking-wide",
        "transition-all duration-200 hover:bg-sky-400 focus:outline-none",
        pending && "opacity-70 cursor-not-allowed"
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting…
        </>
      ) : (
        <>
          <Shield className="h-4 w-4" />
          Launch Command Center
        </>
      )}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"
        >
          Agent Email
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="agent@monthaven.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <SubmitButton />

      <p className="text-center text-xs text-slate-400">
        Access limited to verified Monthaven acquisition agents.
      </p>
    </form>
  );
}
