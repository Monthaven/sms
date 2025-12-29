/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Device, Call } from "@twilio/voice-sdk";
import clsx from "clsx";
import { DispositionModal } from "./DispositionModal";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Voicemail, User, ChevronDown, Pause, Play } from "lucide-react";

type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended" | "failed";

interface CallerId {
  id: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  isDefault: boolean;
  source: "twilio" | "verified" | "custom";
}

interface DialPadProps {
  leadId: string;
  contactName?: string | null;
}

function sanitizedManualDisplay(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function DialPad({ leadId, contactName }: DialPadProps) {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [showDisposition, setShowDisposition] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [manualNumber, setManualNumber] = useState("");
  
  // Caller ID state
  const [callerIds, setCallerIds] = useState<CallerId[]>([]);
  const [selectedCallerId, setSelectedCallerId] = useState<string>("");
  const [showCallerIdDropdown, setShowCallerIdDropdown] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const devRef = useRef<Device | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const endCall = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus("ended");
    setShowDisposition(true);
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    if (activeCall) {
      activeCall.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [activeCall, isMuted]);

  const dropVoicemail = useCallback(async () => {
    if (!callId) return;
    try {
      await fetch("/api/sms/call/voicemail-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });
      endCall();
    } catch (err) {
      setError("Voicemail drop failed");
    }
  }, [callId, endCall]);

  // Hold/Unhold call
  const toggleHold = useCallback(async () => {
    if (!callId) return;
    try {
      const res = await fetch("/api/twilio/voice/hold", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, hold: !isOnHold }),
      });
      if (res.ok) {
        setIsOnHold(!isOnHold);
      } else {
        setError("Failed to toggle hold");
      }
    } catch (err) {
      setError("Hold toggle failed");
    }
  }, [callId, isOnHold]);

  // Fetch available caller IDs
  useEffect(() => {
    const fetchCallerIds = async () => {
      try {
        const res = await fetch("/api/caller-ids");
        if (res.ok) {
          const data = await res.json();
          setCallerIds(data.data || []);
          // Set default caller ID
          const defaultId = data.data?.find((cid: CallerId) => cid.isDefault);
          if (defaultId) {
            setSelectedCallerId(defaultId.phoneNumber);
          }
        }
      } catch (err) {
        // Silent fail - will use default Twilio number
      }
    };
    fetchCallerIds();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCallerIdDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        const res = await fetch("/api/twilio/token");
        if (!res.ok) throw new Error("Unable to fetch Twilio token");
        const data = await res.json();
        const dev = new Device(data.token, { codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU] });
        dev.on("registered", () => setDevice(dev));
        dev.on("error", (e) => setError(e.message));
        await dev.register();
        devRef.current = dev;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Twilio init failed");
      }
    };
    setup();
    return () => {
      devRef.current?.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const startCall = useCallback(async () => {
    if (!device) {
      setError("Device not ready");
      return;
    }
    const sanitizedManual = manualNumber.replace(/[^\d+]/g, "");
    const useManual = sanitizedManual.length > 0;
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/sms/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useManual
            ? { to: sanitizedManual, source: "manual", callerId: selectedCallerId || undefined }
            : { leadId, callerId: selectedCallerId || undefined }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Call init failed");
      const callId = data.data?.callId;
      const to = data.data?.to || sanitizedManual;
      if (!callId || !to) throw new Error("Missing call parameters");
      setCallId(callId);

      const call = await device.connect({
        params: {
          To: to,
          CallId: callId,
          LeadId: leadId,
        },
      });

      setActiveCall(call);
      call.on("ringing", () => setStatus("ringing"));
      call.on("accept", () => {
        setStatus("connected");
        startTimer();
      });
      call.on("disconnect", () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("ended");
        setShowDisposition(true);
        setActiveCall(null);
      });
      call.on("error", (err) => {
        setError(err.message);
        setStatus("failed");
      });

      // Poll server for status in case webhooks lag
      if (callId) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/twilio/voice/status?callId=${callId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === "COMPLETED" || data.status === "FAILED") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              endCall();
            } else if (data.status === "CONNECTED") {
              setStatus("connected");
              if (!timerRef.current) startTimer();
            } else if (data.status === "RINGING") {
              setStatus("ringing");
            }
          } catch {
            /* ignore */
          }
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed");
      setStatus("failed");
    }
  }, [device, leadId, endCall, manualNumber, selectedCallerId]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const statusColors: Record<CallStatus, string> = {
    idle: "text-slate-400",
    connecting: "text-yellow-400",
    ringing: "text-blue-400",
    connected: "text-green-400",
    ended: "text-slate-500",
    failed: "text-red-400",
  };

  return (
    <div className="glass-panel rounded-2xl p-8 max-w-md mx-auto space-y-6">
      {/* Contact Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
          <User size={32} className="text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            {status === "idle" ? "Ready to call" : status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          <h2 className="text-xl font-semibold text-white">
            {manualNumber ? sanitizedManualDisplay(manualNumber) : (contactName || "Unknown Contact")}
          </h2>
        </div>
      </div>

      {/* Timer / Status Display */}
      <div className="text-center">
        <div className={clsx(
          "text-5xl font-mono font-bold transition-colors duration-300",
          statusColors[status]
        )}>
          {status === "connected" ? formatDuration(duration) : status === "idle" ? "00:00" : "..."}
        </div>
        {status === "ringing" && (
          <div className="flex justify-center mt-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full bg-blue-400 animate-pulse ${i === 1 ? '[animation-delay:0.2s]' : i === 2 ? '[animation-delay:0.4s]' : ''}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-4">
          {error}
        </div>
      )}

      {/* Manual Number Entry */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-500">Manual number (optional)</label>
        <input
          value={manualNumber}
          onChange={(e) => setManualNumber(e.target.value)}
          placeholder="+15551234567"
          className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="text-[11px] text-slate-500">Enter to override queue target and dial directly.</p>
      </div>

      {/* Caller ID Selection */}
      {callerIds.length > 1 && (
        <div className="space-y-2" ref={dropdownRef}>
          <label className="text-xs uppercase tracking-wide text-slate-500">Caller ID</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCallerIdDropdown(!showCallerIdDropdown)}
              disabled={status !== "idle" && status !== "failed" && status !== "ended"}
              className={clsx(
                "w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-left text-slate-100",
                "flex items-center justify-between",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                (status !== "idle" && status !== "failed" && status !== "ended") && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="truncate">
                {callerIds.find(cid => cid.phoneNumber === selectedCallerId)?.friendlyName || selectedCallerId || "Select caller ID"}
              </span>
              <ChevronDown size={16} className={clsx("transition-transform", showCallerIdDropdown && "rotate-180")} />
            </button>
            
            {showCallerIdDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {callerIds.filter(cid => cid.capabilities.voice).map((cid) => (
                  <button
                    key={cid.id}
                    onClick={() => {
                      setSelectedCallerId(cid.phoneNumber);
                      setShowCallerIdDropdown(false);
                    }}
                    className={clsx(
                      "w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 transition-colors",
                      selectedCallerId === cid.phoneNumber ? "bg-blue-500/20 text-blue-400" : "text-slate-300"
                    )}
                  >
                    <div className="font-medium">{cid.friendlyName}</div>
                    <div className="text-xs text-slate-500">{cid.phoneNumber}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Select which number appears on recipient&apos;s phone.</p>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center gap-4">
        {status === "idle" || status === "failed" || status === "ended" ? (
          <button
            onClick={startCall}
            disabled={!device && status !== "failed"}
            className={clsx(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
              "bg-green-500 hover:bg-green-400 hover:scale-105",
              "shadow-lg shadow-green-500/30",
              (!device && status !== "failed") && "opacity-50 cursor-not-allowed"
            )}
            title="Start call"
          >
            <Phone size={28} className="text-white" />
          </button>
        ) : (
          <>
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
                isMuted
                  ? "bg-red-500/20 border-2 border-red-500/50 text-red-400"
                  : "bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Hold Button */}
            <button
              onClick={toggleHold}
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
                isOnHold
                  ? "bg-amber-500/20 border-2 border-amber-500/50 text-amber-400"
                  : "bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
              )}
              title={isOnHold ? "Resume" : "Hold"}
            >
              {isOnHold ? <Play size={22} /> : <Pause size={22} />}
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
                "bg-red-500 hover:bg-red-400 hover:scale-105",
                "shadow-lg shadow-red-500/30"
              )}
              title="End call"
            >
              <PhoneOff size={28} className="text-white" />
            </button>

            {/* Voicemail Drop Button */}
            <button
              onClick={dropVoicemail}
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
                "bg-slate-800 border-2 border-slate-700 text-slate-400",
                "hover:text-amber-400 hover:border-amber-500/50"
              )}
              title="Drop voicemail"
            >
              <Voicemail size={22} />
            </button>
          </>
        )}
      </div>

      {/* Volume / Status Indicator */}
      {status === "connected" && (
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Volume2 size={16} />
          <span>{isOnHold ? "Call on hold" : "Call in progress"}</span>
        </div>
      )}

      {/* Disposition Modal */}
      <DispositionModal
        open={showDisposition}
        leadId={leadId}
        callId={callId}
        callDuration={duration}
        onClose={() => setShowDisposition(false)}
        onSaved={() => {
          setShowDisposition(false);
          router.push("/sms/queue");
        }}
      />
    </div>
  );
}
