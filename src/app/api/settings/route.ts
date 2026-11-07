import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULT_COMMUNICATION_PROFILE, DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini";
import { CommunicationProfile, ReminderSettings } from "@/lib/types";
import { DEFAULT_HER_AVATAR, DEFAULT_MY_AVATAR } from "@/lib/pixel-avatar";

export async function GET() {
  try {
    const model = getGeminiModel();
    const apiKey = getGeminiApiKey();
    const hasKey = Boolean(apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here");
    
    const [profile, reminderSettings, theme, privacyRaw, myAvatar, herAvatar] = await Promise.all([
      getSetting<CommunicationProfile>("communication_profile", DEFAULT_COMMUNICATION_PROFILE),
      getSetting<ReminderSettings>("reminder_settings", DEFAULT_REMINDER_SETTINGS),
      getSetting<string>("theme", "romantic-light"),
      getSetting<string>("privacy_acknowledged", "false"),
      getSetting<any>("my_avatar", DEFAULT_MY_AVATAR),
      getSetting<any>("her_avatar", DEFAULT_HER_AVATAR),
    ]);

    const privacyAcknowledged = privacyRaw === "true";

    return NextResponse.json({
      model,
      hasKey,
      profile,
      reminderSettings,
      theme,
      privacyAcknowledged,
      myAvatar,
      herAvatar,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleSaveSettings(req: NextRequest) {
  try {
    const body: any = await req.json();
    const {
      model,
      profile,
      reminderSettings,
      theme,
      privacyAcknowledged,
      myAvatar,
      herAvatar,
      my_avatar_json,
      her_avatar_json,
    } = body;

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
    if (myAvatar) {
      await setSetting("my_avatar", myAvatar);
    } else if (my_avatar_json) {
      try {
        await setSetting("my_avatar", JSON.parse(my_avatar_json));
      } catch {}
    }
    if (herAvatar) {
      await setSetting("her_avatar", herAvatar);
    } else if (her_avatar_json) {
      try {
        await setSetting("her_avatar", JSON.parse(her_avatar_json));
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleSaveSettings(req);
}

export async function PUT(req: NextRequest) {
  return handleSaveSettings(req);
}
