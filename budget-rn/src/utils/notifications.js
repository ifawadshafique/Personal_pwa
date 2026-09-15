import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_ID_KEY = '@daily_notif_id';

// ── Detect Expo Go (push notifications removed in SDK 53+) ──
let Constants;
try {
  Constants = require('expo-constants').default;
} catch (_) {}

const isExpoGo = Constants?.appOwnership === 'expo';

// ── Lazily load expo-notifications to avoid Expo Go crash ──
let Notifications = null;
const getNotifications = () => {
  if (Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge:  false,
      }),
    });
  } catch (_) {
    Notifications = null;
  }
  return Notifications;
};

/**
 * Ask for notification permission.
 * Returns true if granted, false if unsupported (Expo Go) or denied.
 */
export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  if (isExpoGo) {
    console.log('[Notifications] Skipped in Expo Go — use a dev build for notifications.');
    return false;
  }

  try {
    const N = getNotifications();
    if (!N) return false;
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Notifications] Permission request failed:', e.message);
    return false;
  }
}

/**
 * Build notification content based on today's expenses.
 */
function buildMessage(todayExpenses, categories) {
  if (!todayExpenses || todayExpenses.length === 0) {
    return {
      title: "⏰ Don't forget your expenses!",
      body:  "You haven't logged anything today. Tap to add your expenses.",
    };
  }

  const total = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const grouped = {};
  todayExpenses.forEach(exp => {
    const cat = categories.find(c => c.id === exp.categoryId);
    const name = cat ? cat.name : 'Other';
    grouped[name] = (grouped[name] || 0) + exp.amount;
  });

  const lines = Object.entries(grouped)
    .map(([name, amt]) => `${name} ₨${amt.toLocaleString('en-PK')}`)
    .join(' · ');

  return {
    title: `📊 Today — ₨${total.toLocaleString('en-PK')} spent`,
    body:  lines,
  };
}

/**
 * Schedule (or re-schedule) the 10 PM daily notification.
 * No-op in Expo Go or web.
 */
export async function scheduleDailyReminder(todayExpenses = [], categories = []) {
  if (Platform.OS === 'web' || isExpoGo) return;

  try {
    const N = getNotifications();
    if (!N) return;

    // Cancel previous
    const prevId = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (prevId) {
      await N.cancelScheduledNotificationAsync(prevId).catch(() => {});
    }

    const { title, body } = buildMessage(todayExpenses, categories);

    const id = await N.scheduleNotificationAsync({
      content: { title, body, sound: false },
      trigger: { hour: 22, minute: 0, repeats: true },
    });

    await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  } catch (e) {
    console.warn('[Notifications] Scheduling failed:', e.message);
  }
}

/**
 * Cancel the daily reminder (e.g. on logout).
 */
export async function cancelDailyReminder() {
  try {
    const N = getNotifications();
    if (!N) return;
    const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (id) {
      await N.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(NOTIF_ID_KEY);
    }
  } catch (_) {}
}
