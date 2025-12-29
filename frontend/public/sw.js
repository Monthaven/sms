/**
 * PROPRIETARY — Always Improving LLC
 * Service Worker for PWA functionality
 */

const CACHE_NAME = "mae-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests - always go to network
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page if available
          return caches.match("/offline.html");
        });
      })
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body || "New notification",
    icon: data.icon || "/icon-192.png",
    badge: "/badge-72.png",
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || "default",
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "MAE Platform", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/dashboard";

  // Route based on notification type
  if (data.type === "INCOMING_CALL") {
    url = "/dashboard/dialer";
  } else if (data.type === "NEW_MESSAGE") {
    url = data.contactId ? `/dashboard/sms?contact=${data.contactId}` : "/dashboard/sms";
  } else if (data.type === "VOICEMAIL") {
    url = "/dashboard/voicemail";
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline message queue
self.addEventListener("sync", (event) => {
  if (event.tag === "send-messages") {
    event.waitUntil(sendQueuedMessages());
  }
});

async function sendQueuedMessages() {
  // Retrieve queued messages from IndexedDB and send
  // This is a placeholder - actual implementation would use IndexedDB
  console.log("Processing queued messages");
}
