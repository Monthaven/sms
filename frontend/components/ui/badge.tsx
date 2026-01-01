import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          variant === "outline"
            ? "border-slate-600 text-slate-300"
            : "border-white/10 bg-white/10 text-white",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
