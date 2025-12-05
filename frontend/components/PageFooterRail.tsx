import clsx from "clsx";
import Link from "next/link";

export type FooterAction = {
  label: string;
  href: string;
  helper?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant?: "primary" | "ghost";
};

type PageFooterRailProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions: FooterAction[];
  className?: string;
};

export default function PageFooterRail({
  kicker = "Next steps",
  title,
  description,
  actions,
  className,
}: PageFooterRailProps) {
  if (actions.length === 0) return null;

  return (
    <section
      className={clsx(
        "rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-800/40 p-6 text-slate-100",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">
            {kicker}
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-white">{title}</h3>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const variant = action.variant ?? "ghost";
            return (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={clsx(
                  "inline-flex min-w-[8rem] items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
                  variant === "primary"
                    ? "border-sky-400/60 bg-sky-500/10 text-sky-100"
                    : "border-white/15 text-slate-200 hover:text-white"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
