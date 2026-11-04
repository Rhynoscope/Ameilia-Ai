// Amelia Assistant Service Worker
const CACHE_NAME = "amelia-assistant-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Push event from server
self.addEventListener("push", (event) => {
  let data = {
    title: "Amelia Assistant",
    body: "Hey, have you checked in with Amelia today? ❤️",
    data: { url: "/" },
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: data.data || { url: "/" },
    actions: [
      { action: "open_chat", title: "💬 Open AI Coach" },
      { action: "mark_done", title: "✅ Marked Sent" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = action === "open_chat" ? "/chat" : (event.notification.data?.url || "/");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then((focused) => {
            if ("navigate" in focused) {
              return focused.navigate(targetUrl);
            }
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
