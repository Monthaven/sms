"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import clsx from "clsx";
import { DispositionModal } from "./DispositionModal";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Voicemail, User } from "lucide-react";

type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended" | "failed";

interface DialPadProps {
  leadId: string;
  contactName?: string | null;
}

export function DialPad({ leadId, contactName }: DialPadProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [showDisposition, setShowDisposition] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const devRef = useRef<Device | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/sms/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Call init failed");
      const callId = data.data?.callId;
      const to = data.data?.to;
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
  }, [device, leadId, endCall]);

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
          <h2 className="text-xl font-semibold text-white">{contactName || "Unknown Contact"}</h2>
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
                  className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
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

      {/* Volume Indicator */}
      {status === "connected" && (
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Volume2 size={16} />
          <span>Call in progress</span>
        </div>
      )}

      {/* Disposition Modal */}
      <DispositionModal
        open={showDisposition}
        leadId={leadId}
        callDuration={duration}
        onClose={() => setShowDisposition(false)}
        onSaved={() => setShowDisposition(false)}
      />
    </div>
  );
}
