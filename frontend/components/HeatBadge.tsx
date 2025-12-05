import clsx from "clsx";

type HeatBadgeProps = {
  score?: number | null;
  status?: string;
};

const STATUS_DEFAULTS: Record<string, number> = {
  RESP_HOT: 92,
  RESP_WARM: 74,
  CONVERSATION_ACTIVE: 80,
  QUEUED_FOR_CALL: 66,
  SENT: 40,
  NEW: 30,
  RESP_COLD: 25,
  RESP_STOP: 0,
};

export default function HeatBadge({ score, status }: HeatBadgeProps) {
  const resolvedScore =
    typeof score === "number" && !Number.isNaN(score)
      ? Math.max(0, Math.min(score, 100))
      : status
      ? STATUS_DEFAULTS[status] ?? 35
      : undefined;

  const tier = resolveTier(resolvedScore);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
        tier.className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", tier.dot)} />
      Heat · {resolvedScore !== undefined ? resolvedScore : "--"} · {tier.label}
    </span>
  );
}

function resolveTier(value?: number) {
  if (value === undefined) {
    return {
      label: "Unknown",
      className: "bg-white/5 text-slate-200 ring-1 ring-white/20",
      dot: "bg-white/70",
    };
  }
  if (value >= 80) {
    return {
      label: "Hot",
      className: "bg-rose-500/10 text-rose-100 ring-1 ring-rose-400/50",
      dot: "bg-rose-300",
    };
  }
  if (value >= 55) {
    return {
      label: "Warm",
      className: "bg-amber-500/10 text-amber-100 ring-1 ring-amber-400/40",
      dot: "bg-amber-300",
    };
  }
  return {
    label: "Cool",
    className: "bg-slate-700/40 text-slate-200 ring-1 ring-slate-500/40",
    dot: "bg-slate-300",
  };
}
