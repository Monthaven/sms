/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneOff, User, X, Volume2 } from "lucide-react";
import type { Call } from "@twilio/voice-sdk";

interface IncomingCallModalProps {
  call: Call | null;
  callerInfo?: {
    name?: string;
    phone?: string;
    leadId?: string;
  };
  onAnswer: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function IncomingCallModal({
  call,
  callerInfo,
  onAnswer,
  onReject,
  onClose,
}: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);
  const [ringCount, setRingCount] = useState(0);

  // Play ring sound
  useEffect(() => {
    if (!call) return;

    // Visual ring animation
    const ringInterval = setInterval(() => {
      setRingCount((prev) => prev + 1);
    }, 1000);

    // Auto-reject after 30 seconds if not answered
    const timeout = setTimeout(() => {
      onReject();
    }, 30000);

    return () => {
      clearInterval(ringInterval);
      clearTimeout(timeout);
    };
  }, [call, onReject]);

  // Listen for call disconnect
  useEffect(() => {
    if (!call) return;

    const handleDisconnect = () => {
      setIsRinging(false);
      setTimeout(onClose, 500);
    };

    call.on("disconnect", handleDisconnect);
    call.on("cancel", handleDisconnect);

    return () => {
      call.off("disconnect", handleDisconnect);
      call.off("cancel", handleDisconnect);
    };
  }, [call, onClose]);

  if (!call) return null;

  const callerName = callerInfo?.name || "Unknown Caller";
  const callerPhone = callerInfo?.phone || call.parameters?.From || "Unknown";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Animated ring effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute w-32 h-32 rounded-full bg-green-500/20 animate-ping [animation-duration:1.5s]"
          />
          <div
            className="absolute w-48 h-48 rounded-full bg-green-500/10 animate-ping [animation-duration:2s] [animation-delay:0.5s]"
          />
        </div>

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Close button */}
          <button
            onClick={onReject}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Dismiss call"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Incoming call label */}
          <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Incoming Call
            </span>
          </div>

          {/* Caller avatar */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-600 animate-pulse" />
            <div className="absolute inset-1 rounded-full bg-zinc-800 flex items-center justify-center">
              <User className="w-12 h-12 text-zinc-400" />
            </div>
          </div>

          {/* Caller info */}
          <h2 className="text-2xl font-bold text-white mb-1">{callerName}</h2>
          <p className="text-zinc-400 mb-2">{callerPhone}</p>
          
          {callerInfo?.leadId && (
            <a
              href={`/leads/${callerInfo.leadId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-400 hover:text-blue-300 underline mb-4"
            >
              View Lead Details →
            </a>
          )}

          {/* Ring timer */}
          <p className="text-xs text-zinc-500 mb-8">
            Ringing for {ringCount}s...
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-8">
            {/* Reject */}
            <button
              onClick={onReject}
              className="group flex flex-col items-center gap-2"
              aria-label="Reject call"
            >
              <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50">
                <PhoneOff className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-zinc-400">Decline</span>
            </button>

            {/* Answer */}
            <button
              onClick={onAnswer}
              className="group flex flex-col items-center gap-2"
              aria-label="Answer call"
            >
              <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 animate-bounce">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-zinc-400">Answer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
