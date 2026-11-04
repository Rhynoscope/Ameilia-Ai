import { NextRequest, NextResponse } from "next/server";
import {
  addReminderLog,
  getReminderLogs,
  getSetting,
  getTodayStats,
  markReminderCompleted,
  recordQuickCheckin,
  setSetting,
} from "@/lib/db";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";
import { ReminderSettings } from "@/lib/types";

export async function GET() {
  try {
    const [settings, logs, stats] = await Promise.all([
      getSetting<ReminderSettings>("reminder_settings", DEFAULT_REMINDER_SETTINGS),
      getReminderLogs(30),
      getTodayStats(),
    ]);

    return NextResponse.json({
      settings,
      logs,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, notes, settings, scheduled_time, prompt_message } = body;

    if (action === "checkin") {
      const item = await recordQuickCheckin(notes);
      const stats = await getTodayStats();
      return NextResponse.json({ success: true, item, stats });
    }

    if (action === "complete" && id) {
      await markReminderCompleted(Number(id), notes);
      const stats = await getTodayStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === "log_schedule") {
      const item = await addReminderLog(
        scheduled_time || new Date().toISOString(),
        prompt_message || "Check in with Amelia"
      );
      return NextResponse.json({ success: true, item });
    }

    if (action === "update_settings" && settings) {
      await setSetting("reminder_settings", settings);
      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
