import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  BarChart3,
  Users,
  Bot,
  Plug,
  Megaphone,
} from "lucide-react";

export const NAVIGATION_CONFIG = [
  {
    title: "Mission Control",
    items: [
      { id: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "/dashboard/queue", label: "Call Queue", icon: ListTodo },
      { id: "/dashboard/chat", label: "Inbox", icon: MessageSquare },
      { id: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
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

export function getPageTitle(pathname: string | null | undefined) {
  if (!pathname) return { section: "Monthaven", title: "Dashboard" };

  for (const section of NAVIGATION_CONFIG) {
    const item = section.items.find(
      (i) => pathname === i.id || pathname.startsWith(i.id + "/")
    );
    if (item) {
      return { section: section.title, title: item.label };
    }
  }

  return { section: "Monthaven", title: "Dashboard" };
}
