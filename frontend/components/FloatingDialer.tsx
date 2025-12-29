/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * FloatingDialer - Bottom-right floating dialer with call/text options
 * Supports manual dialing, campaign mode, and quick SMS
 * Uses shared TwilioCallProvider for Twilio Voice SDK calls
 */

"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  MessageSquare, 
  X, 
  Mic, 
  MicOff,
  ChevronUp,
  Send,
  User,
  Megaphone,
  Zap,
  Hash,
  Delete,
  Voicemail,
  CheckCircle,
  Volume2
} from "lucide-react";
import clsx from "clsx";
import { useAcceptingMode } from "./AcceptingModeProvider";
import { useTwilioCall } from "./TwilioCallProvider";

type DialerMode = "collapsed" | "dialer" | "sms";
type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended" | "failed";

const DIAL_PAD_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

export default function FloatingDialer() {
  const [mode, setMode] = useState<DialerMode>("collapsed");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  
  // Use shared Twilio Call Provider
  const { 
    isReady: deviceReady, 
    callStatus, 
    activeCallNumber,
    activeCallSid,
    duration,
    isMuted,
    error: callError,
    makeCall: providerMakeCall,
    endCall: providerEndCall,
    toggleMute: handleToggleMute,
    sendDigits,
  } = useTwilioCall();
  
  const { mode: acceptingMode, toggle: toggleAcceptingMode } = useAcceptingMode();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opening dialer
  useEffect(() => {
    if (mode === "dialer" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // Clear SMS sent state after showing success
  useEffect(() => {
    if (smsSent) {
      const timer = setTimeout(() => {
        setSmsSent(false);
        setSmsMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [smsSent]);

  // Handle keyboard input (only when input is not focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "dialer") return;
      
      // Don't capture if input is focused - let the input handle it
      if (document.activeElement === inputRef.current) return;
      
      // ESC to close
      if (e.key === "Escape") {
        setMode("collapsed");
        return;
      }
      
      // Only capture digit/special keys when dialer is open and input not focused
      if (/^[0-9*#]$/.test(e.key)) {
        setPhoneNumber(prev => prev + e.key);
      } else if (e.key === "Backspace" && phoneNumber) {
        setPhoneNumber(prev => prev.slice(0, -1));
      }
      // Note: Enter to call is handled inline to avoid dependency issues
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, phoneNumber]);

  const formatPhoneDisplay = (num: string) => {
    const digits = num.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  };

  const handleDigitPress = (digit: string) => {
    if (callStatus === "connected") {
      // Send DTMF tone during active call
      sendDigits(digit);
    }
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Use the shared provider's makeCall
  const handleCall = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Enter a valid phone number");
      return;
    }

    if (!deviceReady) {
      setError("Phone system not ready. Please wait...");
      return;
    }

    setError(null);
    // Call is handled by the provider
    await providerMakeCall(phoneNumber);
  }, [phoneNumber, deviceReady, providerMakeCall]);

  // Use the shared provider's endCall
  const handleEndCall = useCallback(() => {
    providerEndCall();
  }, [providerEndCall]);

  // Drop voicemail and end agent's side of the call
  const handleVoicemailDrop = useCallback(async () => {
    if (!activeCallSid) {
      setError("Cannot drop voicemail - no active call");
      return;
    }

    try {
      const res = await fetch("/api/twilio/voicemail-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid: activeCallSid }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Voicemail drop failed");
      }

      // End our side of the call
      providerEndCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voicemail drop failed");
    }
  }, [activeCallSid, providerEndCall]);

  const handleSendSMS = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length < 10 || !smsMessage.trim()) {
      setError("Enter phone number and message");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Format phone to E.164 (+1XXXXXXXXXX)
      const digits = phoneNumber.replace(/\D/g, "");
      const formattedPhone = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
      
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formattedPhone,
          message: smsMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "SMS failed");

      // Show success message instead of closing
      setSmsSent(true);
      // Don't clear phone number so user can send another message to same person
    } catch (err) {
      setError(err instanceof Error ? err.message : "SMS failed");
    } finally {
      setSending(false);
    }
  }, [phoneNumber, smsMessage]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Collapsed pill button
  if (mode === "collapsed") {
    return (
      <div className="fixed right-6 bottom-6 z-[60] flex flex-col items-end gap-3">
        {/* Mode Toggle Pill */}
        <button
          onClick={toggleAcceptingMode}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all border border-white/10 bg-slate-900/95 text-white backdrop-blur-lg hover:bg-slate-800"
        >
          <span className={clsx(
            "w-2 h-2 rounded-full",
            acceptingMode === "dialing" 
              ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" 
              : "bg-blue-400 shadow-[0_0_6px_#60a5fa]"
          )} />
          {acceptingMode === "dialing" ? "Dialing" : "Campaign"}
        </button>

        {/* Main Dialer FAB */}
        <button
          onClick={() => setMode("dialer")}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-105 group"
          title="Open Dialer"
        >
          <Phone size={24} className="text-white group-hover:animate-pulse" />
        </button>
      </div>
    );
  }

  // Expanded dialer/SMS panel
  return (
    <div className="fixed right-6 bottom-6 z-[60] w-80 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-[#0f1729]/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            {/* Mode Tabs */}
            <button
              onClick={() => setMode("dialer")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "dialer" 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <PhoneCall size={14} />
              Call
            </button>
            <button
              onClick={() => setMode("sms")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "sms" 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <MessageSquare size={14} />
              SMS
            </button>
          </div>
          <button
            onClick={() => {
              setMode("collapsed");
              setError(null);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Close dialer"
            aria-label="Close dialer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Accepting Mode Badge */}
        <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
          <button
            onClick={toggleAcceptingMode}
            className="w-full flex items-center justify-between text-xs"
          >
            <span className="text-slate-500">Mode:</span>
            <span className={clsx(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              acceptingMode === "dialing" 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "bg-blue-500/10 text-blue-400"
            )}>
              {acceptingMode === "dialing" ? <Zap size={12} /> : <Megaphone size={12} />}
              {acceptingMode === "dialing" ? "Dialing Mode" : "Campaign Mode"}
            </span>
          </button>
        </div>

        {/* Phone Number Display */}
        <div className="p-4 text-center border-b border-slate-700/50">
          {callStatus !== "idle" && callStatus !== "failed" ? (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                <User size={28} className="text-slate-400" />
              </div>
              <div className="text-lg font-mono text-white">
                {formatPhoneDisplay(phoneNumber) || "Unknown"}
              </div>
              <div className={clsx(
                "text-sm font-medium",
                callStatus === "connecting" && "text-yellow-400",
                callStatus === "ringing" && "text-blue-400",
                callStatus === "connected" && "text-emerald-400",
                callStatus === "ended" && "text-slate-500"
              )}>
                {callStatus === "connecting" && "Connecting..."}
                {callStatus === "ringing" && "Ringing..."}
                {callStatus === "connected" && formatDuration(duration)}
                {callStatus === "ended" && "Call Ended"}
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="tel"
                value={formatPhoneDisplay(phoneNumber)}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter number"
                className="w-full text-2xl font-mono text-center text-white bg-transparent border-none outline-none placeholder:text-slate-600"
              />
              {phoneNumber ? (
                <div className="text-[10px] text-slate-500 mt-1">
                  {phoneNumber.replace(/\D/g, "").length} digits
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 mt-2">
                  Enter a real phone number to call
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Dialer Mode Content */}
        {mode === "dialer" && (
          <>
            {/* Dial Pad */}
            {(callStatus === "idle" || callStatus === "failed") && (
              <div className="p-4 grid grid-cols-3 gap-2">
                {DIAL_PAD_KEYS.map(({ digit, letters }) => (
                  <button
                    key={digit}
                    onClick={() => handleDigitPress(digit)}
                    className="h-14 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 flex flex-col items-center justify-center transition-all active:scale-95"
                  >
                    <span className="text-xl font-medium text-white">{digit}</span>
                    {letters && (
                      <span className="text-[9px] text-slate-500 tracking-wider">{letters}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Call Controls */}
            <div className="p-4 flex items-center justify-center gap-4">
              {(callStatus === "idle" || callStatus === "failed" || callStatus === "ended") ? (
                <>
                  <button
                    onClick={handleBackspace}
                    disabled={!phoneNumber}
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Backspace"
                  >
                    <Delete size={20} />
                  </button>
                  <button
                    onClick={handleCall}
                    disabled={phoneNumber.length < 10}
                    className={clsx(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                      phoneNumber.length >= 10
                        ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 hover:scale-105"
                        : "bg-slate-700 cursor-not-allowed opacity-50"
                    )}
                    title="Start Call"
                  >
                    <Phone size={28} className="text-white" />
                  </button>
                  <button
                    onClick={() => setMode("sms")}
                    disabled={phoneNumber.length < 10}
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Send SMS Instead"
                  >
                    <MessageSquare size={20} />
                  </button>
                </>
              ) : (
                <>
                  {/* Mute */}
                  <button
                    onClick={handleToggleMute}
                    className={clsx(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all border-2",
                      isMuted
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    )}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {/* End Call */}
                  <button
                    onClick={handleEndCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30 flex items-center justify-center transition-all hover:scale-105"
                    title="End Call"
                  >
                    <PhoneOff size={28} className="text-white" />
                  </button>

                  {/* Voicemail Drop */}
                  <button
                    onClick={handleVoicemailDrop}
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-all"
                    title="Drop Voicemail"
                  >
                    <Voicemail size={20} />
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* SMS Mode Content */}
        {mode === "sms" && (
          <div className="p-4 space-y-4">
            {/* Success Message */}
            {smsSent && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                <CheckCircle size={18} />
                <span>Message sent successfully!</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase tracking-wide">Message</label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{smsMessage.length} / 160 characters</span>
                <span>{Math.ceil(Math.max(smsMessage.length, 1) / 160)} segment(s)</span>
              </div>
            </div>

            <button
              onClick={handleSendSMS}
              disabled={!phoneNumber || phoneNumber.length < 10 || !smsMessage.trim() || sending}
              className={clsx(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                phoneNumber.length >= 10 && smsMessage.trim() && !sending
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              )}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send SMS
                </>
              )}
            </button>
          </div>
        )}

        {/* Quick Actions Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "w-2 h-2 rounded-full",
                deviceReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              )} />
              <span>{deviceReady ? "Phone ready" : "Connecting..."}</span>
            </div>
            {callStatus === "connected" && (
              <div className="flex items-center gap-1 text-emerald-400">
                <Volume2 size={12} className="animate-pulse" />
                <span>Audio active</span>
              </div>
            )}
            {callStatus === "idle" && <span>ESC to close</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
