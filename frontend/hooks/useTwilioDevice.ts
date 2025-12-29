/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";

export interface TwilioDeviceOptions {
  onIncoming?: (connection: Call) => void;
  onConnect?: (connection: Call) => void;
  onDisconnect?: (connection: Call) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  autoRegister?: boolean;
}

export interface UseTwilioDeviceReturn {
  device: Device | null;
  activeCall: Call | null;
  status: "offline" | "ready" | "busy" | "connecting" | "error";
  error: Error | null;
  register: () => Promise<void>;
  unregister: () => void;
  makeCall: (to: string, params?: Record<string, string>) => Promise<Call | null>;
  acceptCall: () => void;
  rejectCall: () => void;
  hangup: () => void;
  mute: (muted: boolean) => void;
  hold: () => Promise<void>;
  sendDigits: (digits: string) => void;
  isMuted: boolean;
  isOnHold: boolean;
  callDuration: number;
}

export function useTwilioDevice(options: TwilioDeviceOptions = {}): UseTwilioDeviceReturn {
  const {
    onIncoming,
    onConnect,
    onDisconnect,
    onError,
    onReady,
    autoRegister = true,
  } = options;

  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [status, setStatus] = useState<"offline" | "ready" | "busy" | "connecting" | "error">("offline");
  const [error, setError] = useState<Error | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Fetch token and initialize device
  const initializeDevice = useCallback(async () => {
    try {
      setStatus("connecting");
      const response = await fetch("/api/twilio/token");
      if (!response.ok) throw new Error("Failed to fetch token");
      
      const { token } = await response.json();

      const newDevice = new Device(token, {
        codecPreferences: [Call.Codec.PCMU, Call.Codec.Opus],
        closeProtection: true,
      });

      // Device event handlers
      newDevice.on("registered", () => {
        setStatus("ready");
        onReady?.();
      });

      newDevice.on("unregistered", () => {
        setStatus("offline");
      });

      newDevice.on("error", (err) => {
        setError(err);
        setStatus("error");
        onError?.(err);
      });

      newDevice.on("incoming", (call) => {
        setActiveCall(call);
        activeCallRef.current = call;
        setStatus("busy");
        setupCallHandlers(call);
        onIncoming?.(call);
      });

      newDevice.on("tokenWillExpire", async () => {
        // Refresh token before expiry
        const response = await fetch("/api/twilio/token");
        const { token: newToken } = await response.json();
        newDevice.updateToken(newToken);
      });

      deviceRef.current = newDevice;
      setDevice(newDevice);

      if (autoRegister) {
        await newDevice.register();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to initialize device"));
      setStatus("error");
      onError?.(err instanceof Error ? err : new Error("Failed to initialize device"));
    }
  }, [autoRegister, onError, onIncoming, onReady]);

  const setupCallHandlers = useCallback((call: Call) => {
    call.on("accept", () => {
      setStatus("busy");
      callStartTimeRef.current = Date.now();
      startDurationTimer();
      onConnect?.(call);
    });

    call.on("disconnect", () => {
      setActiveCall(null);
      activeCallRef.current = null;
      setStatus("ready");
      setIsMuted(false);
      setIsOnHold(false);
      stopDurationTimer();
      onDisconnect?.(call);
    });

    call.on("cancel", () => {
      setActiveCall(null);
      activeCallRef.current = null;
      setStatus("ready");
      stopDurationTimer();
    });

    call.on("reject", () => {
      setActiveCall(null);
      activeCallRef.current = null;
      setStatus("ready");
    });

    call.on("error", (err) => {
      setError(err);
      onError?.(err);
    });

    call.on("mute", (isMuted: boolean) => {
      setIsMuted(isMuted);
    });
  }, [onConnect, onDisconnect, onError]);

  const startDurationTimer = () => {
    stopDurationTimer();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    setCallDuration(0);
  };

  const register = useCallback(async () => {
    if (deviceRef.current) {
      await deviceRef.current.register();
    } else {
      await initializeDevice();
    }
  }, [initializeDevice]);

  const unregister = useCallback(() => {
    if (deviceRef.current) {
      deviceRef.current.unregister();
    }
  }, []);

  const makeCall = useCallback(async (to: string, params?: Record<string, string>): Promise<Call | null> => {
    if (!deviceRef.current || status === "busy") {
      return null;
    }

    try {
      setStatus("connecting");
      const call = await deviceRef.current.connect({
        params: {
          To: to,
          ...params,
        },
      });

      setActiveCall(call);
      activeCallRef.current = call;
      setupCallHandlers(call);
      return call;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to make call"));
      setStatus("ready");
      return null;
    }
  }, [status, setupCallHandlers]);

  const acceptCall = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.accept();
    }
  }, []);

  const rejectCall = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.reject();
    }
  }, []);

  const hangup = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect();
    }
  }, []);

  const mute = useCallback((muted: boolean) => {
    if (activeCallRef.current) {
      activeCallRef.current.mute(muted);
    }
  }, []);

  const hold = useCallback(async () => {
    // Hold requires TwiML on the server side
    // This is a placeholder - actual implementation needs server support
    setIsOnHold(!isOnHold);
  }, [isOnHold]);

  const sendDigits = useCallback((digits: string) => {
    if (activeCallRef.current) {
      activeCallRef.current.sendDigits(digits);
    }
  }, []);

  useEffect(() => {
    initializeDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
      stopDurationTimer();
    };
  }, [initializeDevice]);

  return {
    device,
    activeCall,
    status,
    error,
    register,
    unregister,
    makeCall,
    acceptCall,
    rejectCall,
    hangup,
    mute,
    hold,
    sendDigits,
    isMuted,
    isOnHold,
    callDuration,
  };
}

// Format call duration as MM:SS
export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
