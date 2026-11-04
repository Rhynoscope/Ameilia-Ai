import { NextRequest, NextResponse } from "next/server";
import { analyzeScreenshots } from "@/lib/gemini";
import { TextingPreferences } from "@/lib/types";

export const maxDuration = 60; // Allow sufficient time for multimodal analysis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, userNotes, preferences } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one screenshot image is required for analysis." },
        { status: 400 }
      );
    }

    // Limit maximum images to protect token usage and performance
    if (images.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 screenshots allowed per analysis to optimize AI efficiency." },
        { status: 400 }
      );
    }

    // Validate image format
    for (const img of images) {
      if (!img.data || typeof img.data !== "string") {
        return NextResponse.json(
          { error: "Invalid image format. Base64 data is required." },
          { status: 400 }
        );
      }
    }

    const analysis = await analyzeScreenshots(
      images,
      userNotes,
      preferences as TextingPreferences
    );

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Screenshot analysis API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze screenshots." },
      { status: 500 }
    );
  }
}
