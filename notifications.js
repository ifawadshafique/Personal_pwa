/*
  notifications.js — runs in the page context only.

  Two layers of reminder, because real background push at an exact time
  needs a server (see README "Phase 2"):

  1. Periodic Background Sync (Chrome/Android, PWA must be installed):
     the service worker itself wakes up roughly once a day and checks
     IndexedDB for today's entry, independent of whether the app is open.
     Not supported on iOS Safari or desktop Safari/Firefox as of 2026.

  2. Foreground fallback (works everywhere): every time the app is opened
     or brought to the foreground, it checks "is it past my reminder time
     today, and have I logged nothing?" — if so it fires a local
     notification (or an in-app banner if permission isn't granted).
*/

async function requestNotificationSetup(reminderTime) {
  if (!("Notification" in window)) {
    return { ok: false, reason: "Notifications aren't supported on this browser." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Permission was not granted." };
  }

  await dbSaveSettings({ reminderTime, remindersEnabled: true });

  // Try to register periodic background sync — best effort, silently
  // ignored where unsupported.
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ("periodicSync" in reg) {
        const status = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (status.state === "granted") {
          await reg.periodicSync.register("daily-expense-check", {
            minInterval: 20 * 60 * 60 * 1000 // ~once a day, browser decides exact timing
          });
        }
      }
    } catch (err) {
      // periodicSync unsupported or blocked — foreground fallback still covers us.
      console.log("periodicSync unavailable:", err.message);
    }
  }

  return { ok: true };
}

function timeStringToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function checkForegroundReminder() {
  const settings = await dbGetSettings();
  if (!settings.remindersEnabled) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderMinutes = timeStringToMinutes(settings.reminderTime || "22:00");

  if (nowMinutes < reminderMinutes) return;

  const lastFired = await dbGetMeta("lastReminderFired", null);
  if (lastFired === todayStr) return;

  const hasEntry = await dbHasExpenseOn(todayStr);
  if (hasEntry) return;

  await dbSetMeta("lastReminderFired", todayStr);
  fireLocalNotification(
    "Log today's spending",
    "You haven't added any expenses today. Add them now so your budget stays accurate."
  );
}

function fireLocalNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    showInAppBanner(body);
    return;
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: "daily-reminder"
      });
    });
  } else {
    new Notification(title, { body, icon: "icons/icon-192.png" });
  }
}

function showInAppBanner(message) {
  const slot = document.getElementById("banner-slot");
  if (!slot) return;
  const div = document.createElement("div");
  div.className = "banner";
  div.innerHTML = `<strong>Reminder — </strong>${message}`;
  slot.prepend(div);
}
