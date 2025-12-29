/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
