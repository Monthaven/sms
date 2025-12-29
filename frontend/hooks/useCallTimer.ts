/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseCallTimerReturn {
  duration: number;
  formatted: string;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useCallTimer(): UseCallTimerReturn {
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now() - (duration * 1000);
    setIsRunning(true);
  }, [isRunning, duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setDuration(0);
    startTimeRef.current = null;
  }, [stop]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatted = formatDuration(duration);

  return {
    duration,
    formatted,
    isRunning,
    start,
    stop,
    reset,
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
