/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * PageFooterRail - Sticky CTA footer pill for dashboard pages
 * Provides contextual actions and navigation hints
 */

"use client";

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Zap } from 'lucide-react';
import clsx from 'clsx';

interface FooterAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface PageFooterRailProps {
  kicker?: string;
  title?: string;
  description?: string;
  actions?: FooterAction[];
  children?: React.ReactNode;
  sticky?: boolean;
}

export default function PageFooterRail({ 
  kicker, 
  title, 
  description, 
  actions = [],
  children,
  sticky = true 
}: PageFooterRailProps) {
  // If no content, don't render
  if (!title && !description && actions.length === 0 && !children) {
    return null;
  }

  const getButtonClasses = (variant: FooterAction['variant'] = 'secondary') => {
    const base = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all";
    switch (variant) {
      case 'primary':
        return clsx(base, "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20");
      case 'ghost':
        return clsx(base, "text-slate-400 hover:text-white hover:bg-slate-800/50");
      default:
        return clsx(base, "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700");
    }
  };

  return (
    <div className={clsx(
      "mt-8 border-t border-slate-700/50 pt-6",
      sticky && "sticky bottom-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120] to-transparent pb-4 -mx-6 px-6"
    )}>
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Zap size={20} className="text-blue-400" />
            </div>
            
            <div>
              {kicker && (
                <div className="text-[10px] uppercase tracking-widest text-blue-400 font-medium mb-1">
                  {kicker}
                </div>
              )}
              {title && (
                <h4 className="text-sm font-semibold text-white mb-0.5">{title}</h4>
              )}
              {description && (
                <p className="text-xs text-slate-400 max-w-md">{description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {actions.map((action, idx) => {
                const Icon = action.icon || ArrowRight;
                const classes = getButtonClasses(action.variant);

                if (action.href) {
                  return (
                    <Link key={idx} href={action.href} className={classes}>
                      {action.label}
                      <Icon size={16} />
                    </Link>
                  );
                }

                return (
                  <button key={idx} onClick={action.onClick} className={classes}>
                    {action.label}
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom children */}
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Pre-built Footer Variants
// ============================================================================

interface QuickNavFooterProps {
  currentRoute: string;
}

export function QuickNavFooter({ currentRoute }: QuickNavFooterProps) {
  const navOptions = [
    { label: 'Inbox', href: '/dashboard', active: currentRoute === '/dashboard' },
    { label: 'Queue', href: '/dashboard/queue', active: currentRoute === '/dashboard/queue' },
    { label: 'Admin', href: '/dashboard/admin', active: currentRoute.startsWith('/dashboard/admin') },
    { label: 'Reports', href: '/dashboard/reports', active: currentRoute === '/dashboard/reports' },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-1 p-1.5 rounded-full bg-slate-900/90 backdrop-blur-lg border border-slate-700/50 shadow-2xl">
        {navOptions.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              opt.active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
