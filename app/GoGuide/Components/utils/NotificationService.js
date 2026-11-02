import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "@goguide_scheduled_reminders";

/**
 * Smart Travel Notifications & Reminders Service
 * Supports Web Notification API and safe in-app scheduling
 */

export async function requestNotificationPermission() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        return result === "granted";
      }
      return Notification.permission === "granted";
    }
    return true;
  } catch (e) {
    console.log("Notification permission error:", e);
    return false;
  }
}

export async function sendLocalNotification(title, body, tag = "goguide-alert") {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag,
        });
        return true;
      }
    }
  } catch (e) {
    console.log("Local notification send error:", e);
  }
  return false;
}

/**
 * Schedules intelligent travel countdown reminders for an active trip
 */
export async function scheduleTripCountdown(destination, startDateStr, hotelName) {
  try {
    if (!destination) return;

    const reminders = [
      {
        id: `packing_${Date.now()}`,
        type: "packing",
        title: `Luggage Prep for ${destination} 🧳`,
        body: `Your trip is approaching! Open your packing checklist to confirm chargers, medicines & passport.`,
        scheduledFor: "48h_before",
      },
      {
        id: `stay_${Date.now()}`,
        type: "hotel",
        title: `Hotel Stay in ${destination} 🏨`,
        body: hotelName ? `Check-in ready for ${hotelName}. Booking confirmation stored in Offline Vault.` : `Check-in information ready in Offline Vault.`,
        scheduledFor: "day_of",
      },
    ];

    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));

    // Request browser permission proactively on web
    await requestNotificationPermission();
  } catch (e) {
    console.log("Schedule trip countdown error:", e);
  }
}

export async function getActiveReminders() {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
