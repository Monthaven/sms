/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import clsx from "clsx";
import { Phone, UserCheck, MapPin, Building2, DollarSign, Clock } from "lucide-react";

type LeadCardProps = {
  lead: {
    id: string;
    status: string;
    callbackAt?: string | null;
    assignedTo?: string | null;
  };
  contact: {
    name: string | null;
    phone: string | null;
    score: number;
    priority: string;
    intent?: string | null;
  };
  property: {
    address: string;
    city: string;
    state: string;
    units: number;
    value: number;
  } | null;
  masked?: boolean;
  currentUserId?: string;
  isClaimed?: boolean;
  onClaim: () => void;
  onCall: () => void;
  disabled?: boolean;
};

const priorityStyles: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const intentStyles: Record<string, string> = {
  HOT: "border-l-4 border-l-red-500",
  WARM: "border-l-4 border-l-yellow-500",
  NEUTRAL: "border-l-4 border-l-slate-500",
  NEGATIVE: "border-l-4 border-l-slate-700",
};

export function LeadCard({
  lead,
  contact,
  property,
  masked,
  currentUserId,
  isClaimed: isClaimedProp,
  onClaim,
  onCall,
  disabled,
}: LeadCardProps) {
  const isClaimed = typeof isClaimedProp === "boolean" ? isClaimedProp : lead.assignedTo === currentUserId;
  const displayPhone = masked ? "•••-•••-••••" : contact.phone || "N/A";
  const callbackDate = lead.callbackAt ? new Date(lead.callbackAt) : null;

  return (
    <div
      className={clsx(
        "glass-panel rounded-xl p-5 transition-all duration-200 hover:bg-slate-800/60",
        intentStyles[contact.intent || "NEUTRAL"] || "",
        isClaimed && "ring-1 ring-green-500/30",
        disabled && "opacity-60 pointer-events-none"
      )}
      data-testid="lead-card"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={clsx(
                "px-2.5 py-1 text-xs font-semibold rounded-lg border",
                priorityStyles[contact.priority] ?? priorityStyles.LOW
              )}
              data-testid="priority-badge"
            >
              {contact.priority}
            </span>
            {contact.intent && contact.intent !== "NEUTRAL" && (
              <span className={clsx(
                "px-2.5 py-1 text-xs font-semibold rounded-lg",
                contact.intent === "HOT" && "bg-red-500/20 text-red-400",
                contact.intent === "WARM" && "bg-orange-500/20 text-orange-400",
                contact.intent === "NEGATIVE" && "bg-slate-700/50 text-slate-500"
              )}>
                {contact.intent}
              </span>
            )}
            <span className="text-xs text-slate-500">
              Score: {contact.score}
            </span>
          </div>

          <div className="mb-3">
            <h3 className="font-semibold text-white text-lg truncate">
              {contact.name || "Unknown Contact"}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-400 font-mono mt-1" data-testid="contact-phone">
              <Phone size={14} className="text-slate-500" />
              {displayPhone}
            </div>
          </div>

          {property && (
            <div className="space-y-1.5 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                <span className="truncate">
                  {property.address}, {property.city} {property.state}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-500" />
                  <span>{property.units} units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-500" />
                  <span>{(property.value || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {callbackDate && (
            <div className="flex items-center gap-2 mt-3 text-sm text-amber-400">
              <Clock size={14} />
              <span>Callback: {callbackDate.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2">
          {!isClaimed ? (
            <button
              onClick={onClaim}
              disabled={disabled}
              data-testid="claim-button"
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                "bg-blue-500/10 border border-blue-500/30 text-blue-400",
                "hover:bg-blue-500/20 hover:border-blue-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <UserCheck size={16} />
              Claim
            </button>
          ) : (
            <button
              onClick={onCall}
              disabled={disabled}
              data-testid="call-button"
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                "bg-green-500/10 border border-green-500/30 text-green-400",
                "hover:bg-green-500/20 hover:border-green-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Phone size={16} />
              Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
