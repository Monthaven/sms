import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { THEME } from "@/lib/theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-screen ${THEME.bg} font-sans text-gray-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden`}
    >
      <div className="hidden md:block shadow-2xl">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto scroll-smooth">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
