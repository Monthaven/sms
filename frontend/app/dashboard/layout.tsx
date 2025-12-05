import BottomNav from "@/components/BottomNav";
import NotificationsPanel from "@/components/NotificationsPanel";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  const navUser = {
    name: currentUser?.name ?? currentUser?.email ?? "Agent",
    role: currentUser?.role ?? "AGENT",
    email: currentUser?.email ?? undefined,
  };

  return (
    <div className="layout-shell text-slate-100">
      <div className="mae-grid" aria-hidden />
      <Sidebar currentUser={navUser} />
      <main className="command-surface">
        <div className="command-inner pb-32">
          <TopBar currentUser={navUser} />
          <div className="command-columns">
            <div className="min-w-0">{children}</div>
            <NotificationsPanel />
          </div>
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
