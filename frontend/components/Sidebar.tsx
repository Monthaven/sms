"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Phone, LogOut } from "lucide-react";

const navItems = [
  { name: "Inbox (Hot)", href: "/dashboard", icon: Inbox },
  { name: "Call Queue", href: "/dashboard/queue", icon: Phone },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6 text-xl font-bold tracking-tight text-center border-b border-slate-800">
        Monthaven
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-900 rounded-md"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
