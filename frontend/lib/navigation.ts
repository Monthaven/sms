/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  BarChart3,
  Users,
  Bot,
  Plug,
  Megaphone,
  GitBranch,
} from "lucide-react";

export const NAVIGATION_CONFIG = [
  {
    title: "Mission Control",
    items: [
      { id: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "/dashboard/queue", label: "Call Queue", icon: ListTodo },
      { id: "/dashboard/chat", label: "Inbox", icon: MessageSquare },
      { id: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
      { id: "/sequences", label: "Sequences", icon: GitBranch },
      { id: "/dashboard/intelligence", label: "Intelligence", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { id: "/dashboard/admin/agents", label: "Team", icon: Users },
      { id: "/dashboard/admin/automations", label: "Auto-Pilot", icon: Bot },
      { id: "/dashboard/admin/integrations", label: "Connections", icon: Plug },
    ],
  },
];

// Compatibility layer for components expecting `NAV_SECTIONS`
export const NAV_SECTIONS = NAVIGATION_CONFIG.map((section) => ({
  label: section.title,
  items: section.items.map((it) => ({ href: it.id, name: it.label, icon: it.icon })),
}));

// --- MISSING EXPORT ADDED HERE ---
export const PRIMARY_NAV = [
  { label: "Inbox", href: "/dashboard/chat" },
  { label: "Queue", href: "/dashboard/queue" },
  { label: "Campaigns", href: "/dashboard/campaigns" },
  { label: "Team", href: "/dashboard/admin/agents" },
];

export function buildBreadcrumbs(pathname: string | null | undefined) {
  if (!pathname) return [{ label: "Monthaven", href: "/dashboard" }];

  for (const section of NAVIGATION_CONFIG) {
    const item = section.items.find((i) => pathname === i.id || pathname.startsWith(i.id + "/"));
    if (item) {
      return [
        { label: section.title, href: "#" },
        { label: item.label, href: item.id },
      ];
    }
  }

  return [{ label: "Monthaven", href: "/dashboard" }];
}

export function getPageTitle(pathname: string | null | undefined) {
  if (!pathname) return { section: "Monthaven", title: "Dashboard" };

  for (const section of NAVIGATION_CONFIG) {
    const item = section.items.find((i) => pathname === i.id || pathname.startsWith(i.id + "/"));
    if (item) {
      return { section: section.title, title: item.label };
    }
  }

  return { section: "Monthaven", title: "Dashboard" };
}