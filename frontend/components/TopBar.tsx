"use client";

import React, { useState } from "react";
import { Search, Bell, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { THEME } from "@/lib/theme";
import { buildBreadcrumbs } from "@/lib/navigation";
import Sidebar from "./Sidebar";

export default function TopBar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Use the "Brain" to determine titles
  const breadcrumbs = buildBreadcrumbs(pathname || "");
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Overview";
  const sectionTitle = breadcrumbs.length > 1 ? breadcrumbs[0].label : "Monthaven";

  return (
    <>
      <header className={`sticky top-0 z-20 flex h-20 items-center justify-between border-b ${THEME.border} ${THEME.bg} px-4 md:px-8`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>

          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white capitalize tracking-tight">{pageTitle}</h1>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span className="hidden md:inline">{sectionTitle}</span>
              <span className="hidden md:inline">/</span>
              <span>System</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Search Bar - Visual Only for now */}
           <div className="relative hidden md:block">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
             <input 
               type="text" 
               placeholder="Global Search..." 
               className="w-64 rounded-lg border border-white/5 bg-[#151B2D] py-2 pl-10 pr-4 text-sm text-gray-200 focus:border-indigo-500/50 focus:outline-none"
             />
           </div>
           
           <button className="relative rounded-xl p-2.5 text-gray-500 transition-all hover:bg-[#1E2538] hover:text-white">
            <Bell size={22} />
            <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 h-full shadow-2xl animate-in slide-in-from-left">
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}