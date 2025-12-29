/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useState, useCallback, useEffect } from "react";

interface UsePushNotificationsReturn {
  permission: NotificationPermission | "unsupported";
  subscription: PushSubscription | null;
  isSupported: boolean;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof window !== "undefined" && 
    "Notification" in window && 
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // Check initial permission and subscription state
  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    // Check existing subscription
    navigator.serviceWorker.ready.then(async (registration) => {
      const existingSubscription = await registration.pushManager.getSubscription();
      setSubscription(existingSubscription);
    }).catch(() => {
      // Service worker not ready yet
    });
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isSupported) {
      setError("Push notifications not supported");
      return null;
    }

    if (Notification.permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        setError("Permission denied");
        return null;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key
      const response = await fetch("/api/push/vapid-key");
      if (!response.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await response.json();

      // Convert base64 to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubscription.toJSON()),
      });

      setSubscription(newSubscription);
      return newSubscription;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isSupported, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    setError(null);

    try {
      await subscription.unsubscribe();
      
      // Remove from server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
      });

      setSubscription(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    isSupported,
    isSubscribed: !!subscription,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
