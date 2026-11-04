import { NextRequest, NextResponse } from "next/server";
import {
  addReminderLog,
  getImportantDates,
  getPushSubscriptions,
  getReminderSettings,
  getTodayStats,
} from "@/lib/db";
import webpush from "web-push";

export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  try {
    const settings = await getReminderSettings();
    if (!settings.enabled) {
      return NextResponse.json({ status: "skipped", reason: "Reminders disabled in settings" });
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Check Quiet Hours
    const [startH] = settings.quietHoursStart.split(":").map(Number);
    const [endH] = settings.quietHoursEnd.split(":").map(Number);

    const isQuiet =
      startH > endH
        ? currentHour >= startH || currentHour < endH
        : currentHour >= startH && currentHour < endH;

    if (isQuiet) {
      return NextResponse.json({ status: "skipped", reason: "Currently within quiet hours" });
    }

    // Check today's progress
    const stats = await getTodayStats();
    if (stats.completedCount >= settings.minPerDay) {
      return NextResponse.json({
        status: "skipped",
        reason: "Daily communication goal already reached",
        completedCount: stats.completedCount,
      });
    }

    // Check important dates
    const dates = await getImportantDates();
    let specialDateNote = "";
    for (const d of dates) {
      const eventDate = new Date(d.event_date);
      const diffTime = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        specialDateNote = `Today is ${d.title}! Don't forget to send Amelia love today ❤️`;
        break;
      } else if (diffDays > 0 && diffDays <= (d.reminder_days_before || 7)) {
        specialDateNote = `Upcoming: ${d.title} is in ${diffDays} day${diffDays === 1 ? "" : "s"}!`;
        break;
      }
    }

    const reminderPrompt =
      specialDateNote ||
      "Hey, have you checked in with Amelia today? Send her a sweet text to let her know you're thinking of her! ❤️";

    // Log reminder schedule in database
    await addReminderLog(now.toISOString(), reminderPrompt);

    // Send Web Push notification if VAPID keys configured
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:amelia-assistant@example.com";

    let sentCount = 0;
    if (vapidPublic && vapidPrivate) {
      const subscriptions = await getPushSubscriptions();
      if (subscriptions && subscriptions.length > 0) {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        const payload = JSON.stringify({
          title: "Amelia Assistant",
          body: reminderPrompt,
          icon: "/icons/icon-192.svg",
          data: { url: "/" },
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sentCount++;
          } catch (err) {
            console.error("Failed to deliver push to subscription:", err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      prompt: reminderPrompt,
      sentPushCount: sentCount,
      streakDays: stats.streakDays,
    });
  } catch (err: any) {
    console.error("Cron reminders error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute cron reminder" }, { status: 500 });
  }
}
