import { NextResponse } from "next/server";
import { getMemories, getImportantDates, getReminderLogs, getSetting, getConversations } from "@/lib/db";
import { DEFAULT_COMMUNICATION_PROFILE, DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";

export async function GET() {
  try {
    const [profile, reminderSettings, memories, importantDates, reminderLogs, conversations] = await Promise.all([
      getSetting("communication_profile", DEFAULT_COMMUNICATION_PROFILE),
      getSetting("reminder_settings", DEFAULT_REMINDER_SETTINGS),
      getMemories(),
      getImportantDates(),
      getReminderLogs(100),
      getConversations({ includeArchived: true }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      profile,
      reminderSettings,
      memories,
      importantDates,
      reminderLogs,
      conversations,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="amelia-assistant-backup-${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
