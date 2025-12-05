"use client";

import AssignmentModal from "@/components/AssignmentModal";
import { updateLeadStatus } from "@/app/actions";
import clsx from "clsx";
import type { LeadStatus } from "@prisma/client";
import { CheckCircle, Clock4, Loader2, PhoneCall, Users } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type Context = "inbox" | "queue" | "chat";

type ActionConfig = {
  label: string;
  status: LeadStatus;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant: "primary" | "ghost" | "warn";
  assignToCurrent?: boolean;
};

type LeadActionButtonsProps = {
  leadId: string;
  context?: Context;
  actions?: ActionConfig[];
  showAssignButton?: boolean;
};

const CONTEXT_ACTIONS: Record<Context, ActionConfig[]> = {
  inbox: [
    {
      label: "Accept",
      status: "CONVERSATION_ACTIVE",
      icon: CheckCircle,
      variant: "primary",
      assignToCurrent: true,
    },
    { label: "Snooze", status: "SENT", icon: Clock4, variant: "ghost" },
  ],
  queue: [
    {
      label: "Call now",
      status: "CONVERSATION_ACTIVE",
      icon: PhoneCall,
      variant: "primary",
      assignToCurrent: true,
    },
    { label: "Reschedule", status: "SENT", icon: Clock4, variant: "ghost" },
  ],
  chat: [
    {
      label: "Accept lead",
      status: "CONVERSATION_ACTIVE",
      icon: CheckCircle,
      variant: "primary",
      assignToCurrent: true,
    },
    { label: "Snooze", status: "SENT", icon: Clock4, variant: "ghost" },
  ],
};

export default function LeadActionButtons({
  leadId,
  context = "inbox",
  actions,
  showAssignButton = true,
}: LeadActionButtonsProps) {
  const configs = useMemo(() => actions ?? CONTEXT_ACTIONS[context], [actions, context]);
  const [pending, startTransition] = useTransition();
  const [assignmentOpen, setAssignmentOpen] = useState(false);

  function run(action: ActionConfig) {
    startTransition(async () => {
      await updateLeadStatus(leadId, action.status, {
        assignToCurrent: action.assignToCurrent,
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {configs.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => run(action)}
            disabled={pending}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition",
              action.variant === "primary" && "border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10",
              action.variant === "ghost" && "border border-white/15 text-slate-200 hover:bg-white/5",
              action.variant === "warn" && "border border-amber-400/40 text-amber-200 hover:bg-amber-400/10",
              pending && "cursor-not-allowed opacity-70"
            )}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {action.label}
          </button>
        );
      })}

      {showAssignButton && (
        <>
          <button
            type="button"
            onClick={() => setAssignmentOpen(true)}
            disabled={pending}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 font-semibold text-slate-200 transition hover:bg-white/5",
              pending && "cursor-not-allowed opacity-70"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Assign
          </button>
          <AssignmentModal
            leadId={leadId}
            open={assignmentOpen}
            onClose={() => setAssignmentOpen(false)}
          />
        </>
      )}
    </div>
  );
}
