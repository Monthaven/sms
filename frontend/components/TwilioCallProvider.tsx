/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * TwilioCallProvider - Shared context for making Twilio calls from anywhere in the app
 * Replaces tel: links with actual Twilio Voice SDK calls
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Device, Call } from "@twilio/voice-sdk";

type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended" | "failed";

interface TwilioCallContextValue {
  // State
  isReady: boolean;
  callStatus: CallStatus;
  activeCallNumber: string | null;
  duration: number;
  isMuted: boolean;
  error: string | null;
  
  // Actions
  makeCall: (phoneNumber: string, leadId?: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  sendDigits: (digits: string) => void;
}

const TwilioCallContext = createContext<TwilioCallContextValue | null>(null);

export function useTwilioCall() {
  const context = useContext(TwilioCallContext);
  if (!context) {
    throw new Error("useTwilioCall must be used within TwilioCallProvider");
  }
  return context;
}

interface TwilioCallProviderProps {
  children: ReactNode;
}

export function TwilioCallProvider({ children }: TwilioCallProviderProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [activeCallNumber, setActiveCallNumber] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const deviceRef = useRef<Device | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device on mount
  useEffect(() => {
    const initDevice = async () => {
      try {
        const res = await fetch("/api/twilio/token");
        if (!res.ok) {
          console.error("Failed to fetch Twilio token");
          return;
        }
        const data = await res.json();
        
        const dev = new Device(data.token, {
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
          allowIncomingWhileBusy: false,
        });

        dev.on("registered", () => {
          console.log("Twilio Device registered (global)");
          setDevice(dev);
          setIsReady(true);
        });

        dev.on("error", (e) => {
          console.error("Twilio Device error:", e);
          setError(e.message);
        });

        await dev.register();
        deviceRef.current = dev;
      } catch (err) {
        console.error("Twilio Device init failed:", err);
      }
    };

    initDevice();

    return () => {
      deviceRef.current?.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format phone to E.164
  const formatPhone = useCallback((phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("1") && digits.length === 11) {
      return `+${digits}`;
    }
    return `+1${digits}`;
  }, []);

  // Make a call
  const makeCall = useCallback(async (phoneNumber: string, leadId?: string) => {
    if (!device || !isReady) {
      setError("Phone system not ready");
      return;
    }

    if (callStatus !== "idle" && callStatus !== "failed" && callStatus !== "ended") {
      setError("Already on a call");
      return;
    }

    setError(null);
    setCallStatus("connecting");
    const formattedPhone = formatPhone(phoneNumber);
    setActiveCallNumber(formattedPhone);

    try {
      // Initiate call on server first
      const res = await fetch("/api/sms/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: formattedPhone, 
          source: "manual",
          leadId: leadId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Call failed");

      const callId = data.data?.callId;

      // Connect via Twilio Device
      const call = await device.connect({
        params: {
          To: formattedPhone,
          CallId: callId || "",
        },
      });

      setActiveCall(call);

      call.on("ringing", () => setCallStatus("ringing"));
      
      call.on("accept", () => {
        setCallStatus("connected");
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
      });

      call.on("disconnect", () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCallStatus("ended");
        setActiveCall(null);
        setDuration(0);
        setIsMuted(false);
        setTimeout(() => {
          setCallStatus("idle");
          setActiveCallNumber(null);
        }, 2000);
      });

      call.on("error", (err) => {
        console.error("Call error:", err);
        setError(err.message || "Call error");
        setCallStatus("failed");
        setActiveCall(null);
      });

      call.on("cancel", () => {
        setCallStatus("ended");
        setActiveCall(null);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed");
      setCallStatus("failed");
    }
  }, [device, isReady, callStatus, formatPhone]);

  // End call
  const endCall = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallStatus("ended");
    setActiveCall(null);
    setDuration(0);
    setIsMuted(false);
    setTimeout(() => {
      setCallStatus("idle");
      setActiveCallNumber(null);
    }, 1500);
  }, [activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      activeCall.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [activeCall, isMuted]);

  // Send DTMF digits
  const sendDigits = useCallback((digits: string) => {
    if (activeCall && callStatus === "connected") {
      activeCall.sendDigits(digits);
    }
  }, [activeCall, callStatus]);

  const value: TwilioCallContextValue = {
    isReady,
    callStatus,
    activeCallNumber,
    duration,
    isMuted,
    error,
    makeCall,
    endCall,
    toggleMute,
    sendDigits,
  };

  return (
    <TwilioCallContext.Provider value={value}>
      {children}
    </TwilioCallContext.Provider>
  );
}
