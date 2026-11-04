import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getPushSubscriptions } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:amelia-assistant@example.com";

    const subscriptions = (await getPushSubscriptions()) as any[];

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({
        success: false,
        message: "VAPID keys not configured in .env. In-browser desktop notifications are active via the Notification API.",
        inBrowserOnly: true,
      });
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No push subscriptions found. Please enable browser notifications first.",
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const payload = JSON.stringify({
      title: "Amelia Assistant",
      body: "Hey, have you checked in with Amelia today? ❤️",
      icon: "/icons/icon-192.svg",
      data: { url: "/" },
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        console.error("Error sending push to sub:", err);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: sent,
      message: `Sent test push notification to ${sent} devices!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
