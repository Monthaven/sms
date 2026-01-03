/**
 * Registers service worker and subscribes to Web Push (if permitted).
 * Uses /api/push/subscribe (GET public key, POST subscription).
 */
"use client";

import { useEffect, useState } from "react";

type PushSubscribeResponse = { publicKey?: string; error?: string };

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/subscribe", { method: "GET" });
    if (!res.ok) return null;
    const data: PushSubscribeResponse = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

async function subscribeForPush(publicKey: string) {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const convertedKey = urlBase64ToUint8Array(publicKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushClient() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || initialized) return;
    let canceled = false;

    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

      // Register service worker
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) return;

      const subscription = await subscribeForPush(publicKey).catch(() => null);
      if (!subscription) return;

      // Save subscription server-side
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      }).catch(() => null);
    })().finally(() => {
      if (!canceled) setInitialized(true);
    });

    return () => {
      canceled = true;
    };
  }, [initialized]);

  return null;
}
