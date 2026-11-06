import { NextRequest, NextResponse } from "next/server";
import { getLearnedPreferences } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const preferences = await getLearnedPreferences();
    return NextResponse.json({ preferences });
  } catch (err: any) {
    console.error("[Preferences API error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch learned preferences." },
      { status: 500 }
    );
  }
}
