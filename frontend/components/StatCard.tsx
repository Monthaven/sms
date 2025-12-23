/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import React from "react";
import clsx from "clsx";
import Card from "@/components/ui/Card";

type StatCardVariant = "default" | "hot" | "warm" | "cool" | "purple" | "success" | "danger";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  trend?: {
    value: number;
    direction: "up" | "down" | "flat";
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<StatCardVariant, { value: string; icon: string; bg: string }> = {
  default: {
    value: "text-white",
    icon: "text-blue-400",
    bg: "",
  },
  hot: {
    value: "text-rose-300",
    icon: "text-rose-400",
    bg: "border-rose-500/20 bg-rose-500/5",
  },
  warm: {
    value: "text-orange-300",
    icon: "text-orange-400",
    bg: "border-orange-500/20 bg-orange-500/5",
  },
  cool: {
    value: "text-slate-300",
    icon: "text-slate-400",
    bg: "",
  },
  purple: {
    value: "text-purple-300",
    icon: "text-purple-400",
    bg: "border-purple-500/20 bg-purple-500/5",
  },
  success: {
    value: "text-emerald-300",
    icon: "text-emerald-400",
    bg: "border-emerald-500/20 bg-emerald-500/5",
  },
  danger: {
    value: "text-red-300",
    icon: "text-red-400",
    bg: "border-red-500/20 bg-red-500/5",
  },
};

export default function StatCard({
  label,
  value,
  icon,
  variant = "default",
  trend,
  subtitle,
  onClick,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  const trendIcon =
    trend?.direction === "up"
      ? "↑"
      : trend?.direction === "down"
      ? "↓"
      : "→";
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-400"
      : trend?.direction === "down"
      ? "text-rose-400"
      : "text-slate-400";

  const content = (
    <Card
      padded
      className={clsx(
        "flex items-center justify-between transition-all",
        styles.bg,
        onClick && "cursor-pointer hover:border-blue-500/30 hover:bg-slate-800/50",
        className
      )}
    >
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={clsx("text-2xl font-bold", styles.value)}>{value}</p>
          {trend && (
            <span className={clsx("text-xs font-medium", trendColor)}>
              {trendIcon} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {icon && <div className={styles.icon}>{icon}</div>}
    </Card>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}