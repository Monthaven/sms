"use client";

import { PRIMARY_NAV } from "@/lib/navigation";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const meta = resolveFooterMeta(pathname);
  const refreshedAt = new Date().toLocaleTimeString();

  return (
    <nav className="footer-pill">
      <div className="footer-pill-content">
        <div className="footer-pill-meta">
          <span className="text-white">
            {meta.scope} • {meta.channel}
          </span>
          <span>{meta.dataset}</span>
          <span>{meta.status}</span>
          <span>Refreshed {refreshedAt}</span>
        </div>
        <div className="footer-pill-nav text-xs">
          {PRIMARY_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  active
                    ? "border border-sky-400/40 bg-sky-500/10 text-white"
                    : "border border-transparent text-slate-400 hover:border-white/20 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

const FOOTER_META = [
  {
    matcher: (path: string) => path.startsWith("/dashboard/admin"),
    scope: "Admin Tower",
    channel: "Ops Suite",
    dataset: "Neon · Campaigns & Agents",
    status: "Storefront · Vercel pooled connection",
  },
  {
    matcher: (path: string) => path.startsWith("/dashboard/queue"),
    scope: "Queue Control",
    channel: "Voice + SMS handoffs",
    dataset: "Leads via Neon · status=QUEUED*",
    status: "Dialer ready",
  },
  {
    matcher: (path: string) => path.startsWith("/dashboard/reports"),
    scope: "Telemetry",
    channel: "Ingestion + Webhooks",
    dataset: "IngestionJob · WebhookLog · Interaction",
    status: "Metabase + Storefront sync",
  },
];

function resolveFooterMeta(pathname: string) {
  const match = FOOTER_META.find((meta) => meta.matcher(pathname));
  return (
    match ?? {
      scope: "Live Inbox",
      channel: "MAE Command Center",
      dataset: "Leads + Contacts via Neon pooled connection",
      status: "Listening for replies",
    }
  );
}
