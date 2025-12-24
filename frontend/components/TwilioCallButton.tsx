/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * TwilioCallButton - Reusable button that triggers Twilio calls
 * Replaces tel: links throughout the app
 */

"use client";

import React from "react";
import { Phone } from "lucide-react";
import clsx from "clsx";
import { useTwilioCall } from "./TwilioCallProvider";

interface TwilioCallButtonProps {
  phoneNumber: string;
  leadId?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "icon";
  size?: "sm" | "md" | "lg";
}

export function TwilioCallButton({
  phoneNumber,
  leadId,
  children,
  className,
  variant = "primary",
  size = "md",
}: TwilioCallButtonProps) {
  const { makeCall, callStatus, isReady } = useTwilioCall();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    makeCall(phoneNumber, leadId);
  };

  const isDisabled = !isReady || (callStatus !== "idle" && callStatus !== "failed" && callStatus !== "ended");

  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-all";
  
  const variantStyles = {
    primary: "rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30",
    secondary: "rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800",
    icon: "rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30",
  };

  const sizeStyles = {
    sm: variant === "icon" ? "w-8 h-8" : "px-3 py-1.5 text-xs",
    md: variant === "icon" ? "w-10 h-10" : "px-4 py-2.5 text-sm",
    lg: variant === "icon" ? "w-12 h-12" : "px-5 py-3 text-base",
  };

  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 20;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={isReady ? `Call ${phoneNumber}` : "Phone system connecting..."}
    >
      <Phone size={iconSize} className={variant === "icon" ? "" : "h-4 w-4"} />
      {variant !== "icon" && (children || "Call")}
    </button>
  );
}

// Wrapper for inline phone links
interface TwilioPhoneLinkProps {
  phoneNumber: string;
  leadId?: string;
  children?: React.ReactNode;
  className?: string;
}

export function TwilioPhoneLink({
  phoneNumber,
  leadId,
  children,
  className,
}: TwilioPhoneLinkProps) {
  const { makeCall, isReady } = useTwilioCall();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    makeCall(phoneNumber, leadId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "text-slate-300 hover:text-white transition cursor-pointer",
        !isReady && "opacity-50",
        className
      )}
      title={isReady ? `Call ${phoneNumber}` : "Phone system connecting..."}
    >
      {children || phoneNumber}
    </button>
  );
}
