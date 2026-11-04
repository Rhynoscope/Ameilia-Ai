// Browser Notification & Web Push Client Manager

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.warn("Service worker registration error:", err);
    return null;
  }
}

/**
 * Plays a pleasant, romantic soft chime using the browser Web Audio API
 */
export function playRomanticChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (warm major chord arpeggio)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.6);
    });
  } catch (e) {
    // Non-blocking if audio blocked by autoplay policies
  }
}

/**
 * Trigger an immediate browser notification with optional sound
 */
export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions & { playSound?: boolean }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
  }

  if (options?.playSound !== false) {
    playRomanticChime();
  }

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      reg.showNotification(title, {
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        ...options,
      });
      return;
    }
  }

  // Fallback direct Notification
  new Notification(title, {
    icon: "/icons/icon-192.svg",
    ...options,
  });
}

/**
 * Generates randomized schedule times for today based on user's window
 * e.g., minPerDay: 3, maxPerDay: 4 between 09:30 and 22:00
 */
export function generateDailyRandomSchedule(
  startTime = "09:30",
  endTime = "22:00",
  count = 3
): string[] {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const totalWindow = Math.max(endMinutes - startMinutes, 60);

  const slotSize = Math.floor(totalWindow / count);
  const times: string[] = [];

  for (let i = 0; i < count; i++) {
    const slotStart = startMinutes + i * slotSize;
    // Add jitter within the slot (avoiding borders)
    const jitter = Math.floor(Math.random() * (slotSize * 0.7));
    const targetMin = slotStart + jitter;

    const h = Math.floor(targetMin / 60) % 24;
    const m = targetMin % 60;
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    times.push(formatted);
  }

  return times.sort();
}
