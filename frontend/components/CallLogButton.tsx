"use client";

import CallOutcomeModal from "@/components/CallOutcomeModal";
import { useState } from "react";
import { PhoneCall } from "lucide-react";
import clsx from "clsx";

type CallLogButtonProps = {
  leadId: string;
  leadName: string;
  className?: string;
};

export default function CallLogButton({ leadId, leadName, className }: CallLogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/5",
          className
        )}
      >
        <PhoneCall className="h-3.5 w-3.5 text-emerald-300" />
        Log call
      </button>
      <CallOutcomeModal
        open={open}
        leadId={leadId}
        leadName={leadName}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
