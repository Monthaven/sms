/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 */

import { redirect } from "next/navigation";

import { Section } from "@/app/(ui)/Section";
import { FadeIn } from "@/components/motion/FadeIn";
import { Badge } from "@/components/ui/badge";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getSessionFromCookies } from "@/lib/auth/get-session";
import { rolesFromSession } from "@/lib/rbac";
import { type PortalTile, PortalTiles } from "./components/PortalTiles";
import { can as canWithRoles } from "@/packages/security/roles";

export const metadata = { title: "Access Portal ƒ?› Monthaven" };

const DESTINATIONS: PortalTile[] = [
  {
    id: "sms",
    title: "SMS Operations",
    description: "Lead queue, caller controls, and script management with compliant sender IDs.",
    href: "https://sms.monthavencapital.com",
    badge: "SMS",
    accent: "blue",
    requiredPermissions: ["sms:send", "sms:callers:manage", "sms:scripts:edit"],
  },
  {
    id: "om",
    title: "OM / Investors",
    description: "Offering memorandums, investor views, NDAs, and gated document delivery.",
    href: "https://om.monthavencapital.com",
    badge: "OM",
    accent: "emerald",
    requiredPermissions: ["om:view", "investor:read"],
    allowRoles: ["investor", "om_ops"],
  },
  {
    id: "deals",
    title: "Deals Workspace",
    description: "Pipeline, LOIs, PSAs, and capital stack tracking with audit-ready history.",
    href: "https://deals.monthavencapital.com",
    badge: "Deals",
    accent: "violet",
    requiredPermissions: ["deals:view", "deals:edit"],
    allowRoles: ["deals_ops"],
  },
  {
    id: "admin",
    title: "Admin Control",
    description: "User provisioning, grant approvals, and platform telemetry with overrides.",
    href: "/admin",
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

function normalizeRoles(roles: string[]) {
  return roles.map((role) => role.trim().toLowerCase()).filter(Boolean);
}

function isTileAllowed(tile: PortalTile, roles: string[]) {
  const normalized = normalizeRoles(roles);
  const roleSet = new Set(normalized);

  if (roleSet.has("admin")) {
    return true;
  }

  if (tile.allowRoles?.some((role) => roleSet.has(role))) {
    return true;
  }

  if (!tile.requiredPermissions || tile.requiredPermissions.length === 0) {
    return true;
  }

  return tile.requiredPermissions.some((perm) => canWithRoles(normalized, perm));
}

export default async function PortalLanding() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/signin");
  }

  const roles = rolesFromSession(session);
  const allowedTiles = DESTINATIONS.filter((tile) => isTileAllowed(tile, roles));
  const membership = session.membershipStatus ?? "pending";
  const displayEmail =
    typeof session.claims.email === "string"
      ? session.claims.email
      : typeof session.claims.sub === "string"
        ? session.claims.sub
        : "Authenticated user";

  return (
    <FadeIn duration={0.4}>
      <Section
        title="Unified Access"
        subtitle="Single sign-on across SMS, OM/Investors, and Deals with role-aware routing and NDA gates."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-lg)", marginBottom: "var(--space-xl)" }}>
          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent className="glass-stack" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <div>
                <p className="text-ink-muted">Signed in as</p>
                <p className="text-ink" style={{ fontWeight: "var(--font-weight-semibold)" }}>
                  {displayEmail}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                <Badge>{`membership: ${membership}`}</Badge>
                {roles.length > 0 ? <Badge className="glass-badge">{roles.join(", ")}</Badge> : <Badge className="glass-badge">no-roles</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Access Policy</CardTitle>
            </CardHeader>
            <CardContent className="glass-stack" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <p className="text-ink-muted">
                RBAC is enforced server-side via Stack JWT claims and mirrored in the UI. Admins see all tiles; other roles surface only destinations mapped to their
                permissions.
              </p>
              <p className="text-ink-muted">
                Deep links remain intact via <code>?next=/target</code> and shared cookies (`SameSite=None; Secure`) across <code>.monthavencapital.com</code>.
              </p>
            </CardContent>
          </Card>
        </div>

        <PortalTiles items={allowedTiles} />
      </Section>
    </FadeIn>
  );
}
