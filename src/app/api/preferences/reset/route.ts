import { NextRequest, NextResponse } from "next/server";
import { resetAllResponseFeedback, getLearnedPreferences } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await resetAllResponseFeedback();
    const preferences = await getLearnedPreferences();
    return NextResponse.json({
      success: true,
      message: "All learned response feedback and weights have been successfully reset.",
      preferences,
    });
  } catch (err: any) {
    console.error("[Preferences Reset error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reset learned preferences." },
      { status: 500 }
    );
  }
}
