"use client";

import { logoutAction } from "@/app/actions";
import { NAV_SECTIONS } from "@/lib/navigation";
import { LogOut, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  currentUser?: {
    name?: string | null;
    role?: string | null;
  };
};

export default function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/10 bg-slate-950/80 px-6 py-8 backdrop-blur-xl">
      <div>
        <div className="flex items-center gap-3 text-white">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-2">
            <Sparkles className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Monthaven</p>
            <p className="text-lg font-semibold">MAE Command</p>
          </div>
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-slate-600">Navigation</p>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600">{section.label}</p>
            <nav className="mt-3 space-y-2">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-sky-400/40 bg-sky-500/10 text-white"
                        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-4 text-xs text-slate-400">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-2">
            <User className="h-4 w-4 text-sky-300" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{currentUser?.name ?? "Agent"}</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              {currentUser?.role ?? "AGENT"}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-slate-500">Engine</p>
          <p className="text-sm text-white">Local · ts-node scripts</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Status</p>
          <p className="text-emerald-300">Ready for ingest</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-slate-500">Storefront</p>
          <p className="text-sm text-white">Vercel · Neon pool</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Status</p>
          <p className="text-sky-300">Listening for replies</p>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
