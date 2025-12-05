import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Phone,
  Settings2,
  Users2,
  Radio,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Command",
    items: [
      { name: "Overview", href: "/dashboard", icon: Activity },
      { name: "Call Queue", href: "/dashboard/queue", icon: Phone },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Control Tower", href: "/dashboard/admin", icon: Settings2 },
      { name: "Campaigns", href: "/dashboard/admin/campaigns", icon: Radio },
      { name: "Agents", href: "/dashboard/admin/agents", icon: Users2 },
      { name: "Automations", href: "/dashboard/admin/automations", icon: Activity },
      { name: "Integrations", href: "/dashboard/admin/integrations", icon: Settings2 },
    ],
  },
];

export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Command" },
  { href: "/dashboard/queue", label: "Queue" },
  { href: "/dashboard/admin", label: "Admin" },
  { href: "/dashboard/reports", label: "Reports" },
];

const DEFAULT_SUB_NAV = [
  { href: "/dashboard", label: "Inbox Overview" },
  { href: "/dashboard/queue", label: "Call Queue" },
  { href: "/dashboard/reports", label: "Telemetry" },
  { href: "/dashboard/admin", label: "Admin Tower" },
];

const SUB_NAV_CONFIG = [
  {
    matcher: (path: string) => path.startsWith("/dashboard/admin"),
    items: NAV_SECTIONS.find((section) => section.label === "Admin")?.items.map((item) => ({
      href: item.href,
      label: item.name,
    })),
  },
  {
    matcher: (path: string) =>
      path.startsWith("/dashboard/chat") ||
      path.startsWith("/dashboard/queue") ||
      path === "/dashboard",
    items: DEFAULT_SUB_NAV,
  },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Command Center",
  queue: "Call Queue",
  reports: "Reports",
  admin: "Admin",
  campaigns: "Campaigns",
  agents: "Agents",
  automations: "Automations",
  integrations: "Integrations",
  chat: "Chat",
};

export function resolveSubNav(pathname: string) {
  const match = SUB_NAV_CONFIG.find((config) => config.matcher(pathname));
  return match?.items ?? [];
}

export function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let current = "";

  segments.forEach((segment) => {
    current += `/${segment}`;
    const label =
      BREADCRUMB_LABELS[segment] ??
      (segment.length > 18 ? "Detail" : capitalize(segment));
    crumbs.push({ href: current, label });
  });

  if (crumbs.length === 0) {
    crumbs.push({ href: "/dashboard", label: "Command Center" });
  }

  return crumbs;
}

function capitalize(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}
