const CACHE_NAME = "meri-budget-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./db.js",
  "./notifications.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.importScripts("db.js");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Offline-first for app shell files, network-first fallback for anything else.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("./index.html"))
      );
    })
  );
});

// Fires roughly once a day on supported platforms (Chrome/Android, installed PWA)
// even if the app is fully closed. See notifications.js for the foreground fallback
// that covers browsers without periodicSync support.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-expense-check") {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  const settings = await dbGetSettings();
  if (!settings.remindersEnabled) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [rh, rm] = (settings.reminderTime || "22:00").split(":").map(Number);
  const isPastReminderTime =
    now.getHours() > rh || (now.getHours() === rh && now.getMinutes() >= rm);

  if (!isPastReminderTime) return;

  const lastFired = await dbGetMeta("lastReminderFired", null);
  if (lastFired === todayStr) return;

  const hasEntry = await dbHasExpenseOn(todayStr);
  if (hasEntry) return;

  await dbSetMeta("lastReminderFired", todayStr);
  await self.registration.showNotification("Log today's spending", {
    body: "You haven't added any expenses today. Add them now so your budget stays accurate.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "daily-reminder"
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
