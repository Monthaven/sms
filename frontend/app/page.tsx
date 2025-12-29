/**
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Landing portal with RBAC-aware tiles. Requires session cookies set by the app
 * (`mae_user`, `mae_role`). If no session, redirect to /signin.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Gauge, MessageSquare, ShieldCheck } from "lucide-react";

import Card from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getRolesFromCookies } from "@/lib/rbac";
import "@/app/portal.css";

type PortalTile = {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  accent?: "emerald" | "amber" | "blue" | "violet";
  requiredPermissions?: string[];
  allowRoles?: string[];
};

const DESTINATIONS: PortalTile[] = [
  {
    id: "sms",
    title: "SMS Operations",
    description: "Lead queue, caller controls, and script management with compliant sender IDs.",
    href: "/dashboard",
    badge: "SMS",
    accent: "blue",
    requiredPermissions: ["sms:send", "sms:callers:manage", "sms:scripts:edit"],
  },
  {
    id: "om",
    title: "OM / Investors",
    description: "Offering memorandums, investor views, NDAs, and gated document delivery.",
    href: "/om",
    badge: "OM",
    accent: "emerald",
    allowRoles: ["investor", "om_ops"],
    requiredPermissions: ["om:view", "investor:read"],
  },
  {
    id: "deals",
    title: "Deals Workspace",
    description: "Pipeline, LOIs, PSAs, and capital stack tracking with audit-ready history.",
    href: "/deals",
    badge: "Deals",
    accent: "violet",
    allowRoles: ["deals_ops"],
    requiredPermissions: ["deals:view", "deals:edit"],
  },
  {
    id: "admin",
    title: "Admin Control",
    description: "User provisioning, grant approvals, and platform telemetry with overrides.",
    href: "/dashboard/admin",
    badge: "Admin",
    accent: "amber",
    allowRoles: ["admin", "manager"],
  },
  {
    id: "dev",
    title: "Developer Console",
    description: "Staging links, feature flags, and smoke tests for stack and database health.",
    href: "/tools",
    badge: "Dev",
    accent: "blue",
    allowRoles: ["dev"],
    requiredPermissions: ["deals:view"],
  },
];

const iconMap: Record<NonNullable<PortalTile["accent"]>, typeof Gauge> = {
  emerald: ShieldCheck,
  amber: BadgeCheck,
  blue: MessageSquare,
  violet: Gauge,
};

function normalizeRoles(roles: string[]) {
  return roles.map((role) => role.trim().toLowerCase()).filter(Boolean);
}

function isTileAllowed(tile: PortalTile, roles: string[], can: (perm: string) => boolean) {
  const normalized = normalizeRoles(roles);
  const roleSet = new Set(normalized);

  if (roleSet.has("admin")) return true;
  if (tile.allowRoles?.some((role) => roleSet.has(role))) return true;
  if (!tile.requiredPermissions?.length) return true;
  return tile.requiredPermissions.some((perm) => can(perm));
}

export default function PortalLanding() {
  const cookieStore = cookies();
  const hasSession = Boolean(cookieStore.get("mae_user")?.value);
  if (!hasSession) {
    redirect("/signin");
  }

  const { roles, can, membership, emailDisplay } = getRolesFromCookies(cookieStore);
  if (membership === "pending") {
    redirect("/awaiting-approval");
  }

  const allowedTiles = DESTINATIONS.filter((tile) => isTileAllowed(tile, roles, can));

  return (
    <div className="portal-landing">
      <div className="portal-landing__shell">
        <header className="portal-landing__header">
          <div>
            <p className="portal-landing__eyebrow">Unified Access</p>
            <h1 className="portal-landing__title">Monthaven Command Portal</h1>
            <p className="portal-landing__subtitle">
              Single sign-on across SMS, OM/Investors, and Deals with role-aware routing.
            </p>
          </div>
          <Card className="portal-landing__session">
            <div>
              <p className="portal-landing__label">Signed in as</p>
              <p className="portal-landing__value">{emailDisplay}</p>
            </div>
            <div className="portal-landing__badges">
              <span className="portal-tiles__badge">membership: {membership}</span>
              {roles.length ? <span className="portal-tiles__badge glass">{roles.join(", ")}</span> : <span className="portal-tiles__badge glass">no-roles</span>}
            </div>
          </Card>
        </header>

        <section className="portal-tiles__grid">
          {allowedTiles.length === 0 ? (
            <Card className="portal-tiles__empty">
              <p className="portal-tiles__title">No destinations available</p>
              <p className="portal-tiles__content">Your account is active, but no roles map to portal destinations. Contact an admin to request access.</p>
            </Card>
          ) : (
            allowedTiles.map((tile) => {
              const Icon = iconMap[tile.accent ?? "emerald"] ?? Gauge;
              return (
                <a key={tile.id} href={tile.href} className="portal-tiles__link">
                  <Card className={`portal-tiles__card${tile.accent ? ` portal-tiles__card--${tile.accent}` : ""}`}>
                    <div className="portal-tiles__card-header">
                      <div className="portal-tiles__eyebrow">
                        {tile.badge ? <span className="portal-tiles__badge">{tile.badge}</span> : null}
                        <Icon aria-hidden="true" size={16} />
                      </div>
                      <h3>{tile.title}</h3>
                    </div>
                    <div className="portal-tiles__card-body">
                      <p>{tile.description}</p>
                      <span className="portal-tiles__cta">
                        Open
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </Card>
                </a>
              );
            })
          )}
        </section>

        <div className="portal-landing__footer">
          <a href="/signin" className="portal-landing__button">
            <Button variant="secondary" className="w-full">
              Switch account
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
