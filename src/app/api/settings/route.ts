import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULT_COMMUNICATION_PROFILE, DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini";
import { CommunicationProfile, ReminderSettings } from "@/lib/types";

export async function GET() {
  try {
    const model = getGeminiModel();
    const apiKey = getGeminiApiKey();
    const hasKey = Boolean(apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here");
    
    const [profile, reminderSettings, theme, privacyRaw] = await Promise.all([
      getSetting<CommunicationProfile>("communication_profile", DEFAULT_COMMUNICATION_PROFILE),
      getSetting<ReminderSettings>("reminder_settings", DEFAULT_REMINDER_SETTINGS),
      getSetting<string>("theme", "romantic-light"),
      getSetting<string>("privacy_acknowledged", "false"),
    ]);

    const privacyAcknowledged = privacyRaw === "true";

    return NextResponse.json({
      model,
      hasKey,
      profile,
      reminderSettings,
      theme,
      privacyAcknowledged,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, profile, reminderSettings, theme, privacyAcknowledged } = body;

    if (model) {
      await setSetting("gemini_model", model);
    }
    if (profile) {
      await setSetting("communication_profile", profile);
    }
    if (reminderSettings) {
      await setSetting("reminder_settings", reminderSettings);
    }
    if (theme) {
      await setSetting("theme", theme);
    }
    if (privacyAcknowledged !== undefined) {
      await setSetting("privacy_acknowledged", String(privacyAcknowledged));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
