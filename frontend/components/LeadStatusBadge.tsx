import clsx from "clsx";

const STATUS_STYLES: Record<
  string,
  { label: string; ring: string; dot: string; text: string; bg: string }
> = {
  RESP_HOT: {
    label: "HOT",
    ring: "ring-amber-400/60",
    dot: "bg-amber-300",
    text: "text-amber-100",
    bg: "bg-amber-400/10",
  },
  RESP_WARM: {
    label: "WARM",
    ring: "ring-emerald-400/60",
    dot: "bg-emerald-300",
    text: "text-emerald-100",
    bg: "bg-emerald-500/10",
  },
  CONVERSATION_ACTIVE: {
    label: "ACTIVE",
    ring: "ring-sky-400/60",
    dot: "bg-sky-300",
    text: "text-sky-100",
    bg: "bg-sky-500/10",
  },
  QUEUED_FOR_CALL: {
    label: "CALL QUEUE",
    ring: "ring-purple-400/50",
    dot: "bg-purple-300",
    text: "text-purple-100",
    bg: "bg-purple-500/10",
  },
  SENT: {
    label: "SENT",
    ring: "ring-slate-400/40",
    dot: "bg-white/70",
    text: "text-slate-100",
    bg: "bg-slate-500/10",
  },
  NEW: {
    label: "NEW",
    ring: "ring-cyan-400/50",
    dot: "bg-cyan-300",
    text: "text-cyan-100",
    bg: "bg-cyan-500/10",
  },
  RESP_STOP: {
    label: "STOPPED",
    ring: "ring-rose-400/70",
    dot: "bg-rose-300",
    text: "text-rose-100",
    bg: "bg-rose-500/15",
  },
};

export default function LeadStatusBadge({ status }: { status: string }) {
  const meta =
    STATUS_STYLES[status] || STATUS_STYLES.NEW;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1",
        meta.ring,
        meta.bg,
        meta.text
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
