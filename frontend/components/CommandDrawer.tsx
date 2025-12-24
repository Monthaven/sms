/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * CommandDrawer - Slide-out drawer for assign/status actions
 * Supports keyboard navigation (ESC to close, Tab through controls)
 */

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { X, UserPlus, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import clsx from "clsx";

interface CommandDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function CommandDrawer({ open, onClose, title, description, children }: CommandDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus first focusable element
      setTimeout(() => firstFocusableRef.current?.focus(), 100);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={clsx(
          "fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50",
          "transform transition-transform duration-300 ease-out",
          "shadow-2xl shadow-black/50",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <h2 id="drawer-title" className="text-lg font-semibold text-white">{title}</h2>
            {description && (
              <p className="text-sm text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-72px)] custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Pre-built Action Panels for Common Operations
// ============================================================================

interface AssignLeadPanelProps {
  leadId: string;
  agents: Array<{ id: string; name: string; status: string; leadsAssigned: number }>;
  currentAgentId?: string;
  onAssign: (agentId: string) => Promise<void>;
  isLoading?: boolean;
}

export function AssignLeadPanel({ 
  leadId, 
  agents, 
  currentAgentId, 
  onAssign,
  isLoading 
}: AssignLeadPanelProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        Available Agents
      </div>
      
      <div className="space-y-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onAssign(agent.id)}
            disabled={isLoading || agent.id === currentAgentId}
            className={clsx(
              "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
              agent.id === currentAgentId
                ? "bg-blue-500/10 border-blue-500/30 cursor-default"
                : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                {agent.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">{agent.name}</div>
                <div className="text-xs text-slate-500">
                  {agent.leadsAssigned} leads • {agent.status}
                </div>
              </div>
            </div>
            {agent.id === currentAgentId ? (
              <span className="text-xs text-blue-400 font-medium">Assigned</span>
            ) : (
              <UserPlus size={18} className="text-slate-400" />
            )}
          </button>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No agents available
        </div>
      )}
    </div>
  );
}

interface StatusActionPanelProps {
  leadId: string;
  currentStatus: string;
  onStatusChange: (status: string) => Promise<void>;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: "RESP_HOT", label: "Hot Lead", icon: CheckCircle, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { value: "QUEUED_FOR_CALL", label: "Queue for Call", icon: Clock, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "RESP_WARM", label: "Warm Lead", icon: ArrowRight, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "RESP_COLD", label: "Cold Lead", icon: XCircle, color: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  { value: "ARCHIVED", label: "Archive", icon: X, color: "text-slate-500 bg-slate-600/10 border-slate-600/30" },
];

export function StatusActionPanel({ 
  leadId, 
  currentStatus, 
  onStatusChange,
  isLoading 
}: StatusActionPanelProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        Update Status
      </div>
      
      <div className="space-y-2">
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = currentStatus === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              disabled={isLoading || isActive}
              className={clsx(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                isActive ? option.color : "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
              )}
            >
              <Icon size={18} className={isActive ? "" : "text-slate-400"} />
              <span className={clsx("text-sm font-medium", isActive ? "" : "text-slate-300")}>
                {option.label}
              </span>
              {isActive && (
                <span className="ml-auto text-xs font-medium">Current</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
