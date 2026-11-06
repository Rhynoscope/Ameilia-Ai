import { NextRequest, NextResponse } from "next/server";
import { recordResponseFeedback, getLearnedPreferences } from "@/lib/db";
import { SituationContext } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const {
      conversationId,
      suggestionText,
      rating,
      situationContext,
      tone,
      styleTags,
      lengthCategory,
      reasoning,
    } = body;

    if (!suggestionText || typeof suggestionText !== "string" || suggestionText.trim().length === 0) {
      return NextResponse.json(
        { error: "suggestionText is required and cannot be empty." },
        { status: 400 }
      );
    }

    if (rating !== "like" && rating !== "dislike") {
      return NextResponse.json(
        { error: "rating must be either 'like' or 'dislike'." },
        { status: 400 }
      );
    }

    const recorded = await recordResponseFeedback({
      conversation_id: conversationId,
      suggestion_text: suggestionText.trim(),
      rating,
      situation_context: situationContext as SituationContext,
      tone,
      style_tags: styleTags,
      length_category: lengthCategory,
      reasoning,
    });

    const preferences = await getLearnedPreferences();

    return NextResponse.json({
      success: true,
      feedback: recorded,
      preferences,
    });
  } catch (err: any) {
    console.error("[Preferences Feedback error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to record response feedback." },
      { status: 500 }
    );
  }
}
