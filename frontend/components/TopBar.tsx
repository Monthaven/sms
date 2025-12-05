"use client";

import { PRIMARY_NAV, resolveSubNav, buildBreadcrumbs } from "@/lib/navigation";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Play,
  Settings,
  Shield,
  User,
  Server,
  RadioTower,
} from "lucide-react";

const filters = ["Live", "Last 24h", "Last 7d"];

type TopBarProps = {
  currentUser?: {
    name?: string | null;
    role?: string | null;
    email?: string | null;
  };
};

export default function TopBar({ currentUser }: TopBarProps) {
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const subNav = useMemo(() => resolveSubNav(pathname), [pathname]);

  const systemStatuses = [
    {
      label: "Engine",
      value: "Local · ts-node scripts",
      meta: "Ready for ingest",
      icon: <Server className="h-4 w-4 text-sky-300" />,
    },
    {
      label: "Storefront",
      value: "Vercel · Neon pool",
      meta: "Listening for replies",
      icon: <RadioTower className="h-4 w-4 text-emerald-300" />,
    },
    {
      label: "Ops Status",
      value: "89 active conversations",
      meta: "Hot + warm queue",
      icon: <Shield className="h-4 w-4 text-indigo-300" />,
    },
  ];

  return (
    <header className="mb-10 space-y-4 text-slate-100">
      <div className="topbar-shell flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            {new Date().toLocaleString()}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
              Monthaven Admin
            </p>
            <h1 className="text-white">Agent Command Console</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              All inbound EzTexting replies land here instantly via Neon. Track
              hot conversations, move call-eligible leads into the queue, and
              monitor the balance between local ingestion and cloud listeners.
            </p>
          </div>
          <div className="status-grid">
            {systemStatuses.map((status) => (
              <div key={status.label} className="status-card">
                <strong>{status.label}</strong>
                <span className="flex items-center gap-2 text-base">
                  {status.icon}
                  {status.value}
                </span>
                <small className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-500">
                  {status.meta}
                </small>
              </div>
            ))}
          </div>
          <nav className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.4em] text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {idx > 0 && <span className="text-slate-600">/</span>}
                <Link
                  href={crumb.href}
                  className={clsx(
                    "transition hover:text-slate-200",
                    idx === breadcrumbs.length - 1 && "text-white"
                  )}
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <nav className="topbar-nav text-xs">
            {PRIMARY_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-full px-3 py-1 font-semibold transition",
                    active
                      ? "bg-sky-500/25 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={clsx(
                    "rounded-full px-3 py-1 font-semibold transition-colors",
                    activeFilter === filter
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-slate-400 hover:text-slate-100"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <button className="mae-button ghost text-xs">
              <Settings className="h-4 w-4" />
              Preferences
            </button>
            <button className="mae-button primary text-xs">
              <Play className="h-4 w-4" />
              Launch Engine
            </button>
            <AccountButton
              name={currentUser?.name ?? "Agent"}
              role={currentUser?.role ?? "AGENT"}
              email={currentUser?.email ?? ""}
              open={menuOpen}
              onToggle={() => setMenuOpen((prev) => !prev)}
            />
          </div>
        </div>
      </div>
      {subNav.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-100"
                    : "border-white/15 text-slate-300 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

function AccountButton({
  name,
  role,
  email,
  open,
  onToggle,
}: {
  name: string;
  role: string;
  email: string;
  open: boolean;
  onToggle: () => void;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-[11px]">
          {initials}
        </span>
        <span className="text-left">
          {name}
          <span className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">
            {role}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-slate-900/90 p-3 text-sm shadow-xl">
          <p className="text-xs text-slate-400">{email}</p>
          <div className="mt-3 space-y-2 text-xs">
            <Link
              href="/dashboard/admin/agents"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-200 hover:border-sky-400/40"
            >
              <Shield className="h-4 w-4 text-sky-300" />
              Admin Console
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-200 hover:border-sky-400/40"
            >
              <User className="h-4 w-4 text-emerald-300" />
              Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
