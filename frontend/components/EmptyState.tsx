"use client";

import Link from "next/link";
import React from "react";
import { Inbox, Wifi } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ComponentType<any>;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full opacity-20">
        <Icon className="w-24 h-24 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-400">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/6 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
