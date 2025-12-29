"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Mobile Bottom Navigation Component
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  MessageSquare,
  Phone,
  Users,
  MoreHorizontal,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/sms", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/dialer", icon: Phone, label: "Dialer" },
  { href: "/dashboard/contacts", icon: Users, label: "Contacts" },
  { href: "/dashboard/more", icon: MoreHorizontal, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 
                    border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full",
                "transition-colors touch-manipulation",
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 mb-0.5",
                isActive && "stroke-[2.5]"
              )} />
              <span className={cn(
                "text-xs",
                isActive && "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Floating Action Button for quick actions
 */
interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
}

export function FloatingActionButton({ onClick, icon, label }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 md:bottom-6 z-40 flex items-center gap-2 
                 px-4 py-3 bg-indigo-500 text-white rounded-full shadow-lg
                 hover:bg-indigo-600 active:scale-95 transition-all touch-manipulation"
    >
      {icon || <Phone className="w-5 h-5" />}
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}
