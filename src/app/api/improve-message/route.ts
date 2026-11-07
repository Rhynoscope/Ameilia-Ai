import { NextRequest, NextResponse } from "next/server";
import { improveMessage } from "@/lib/gemini";
import { IMPROVEMENT_STYLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const {
      message,
      styleId,
      customInstruction,
      previousVersions,
      conversationContext,
      dislikedTraits,
      situationContext,
    } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const style = IMPROVEMENT_STYLES.find((s) => s.id === styleId);
    const stylePrompt =
      customInstruction ||
      style?.prompt ||
      "Generate a fresh, natural, and authentic variation with different phrasing.";

    const result = await improveMessage(
      message.trim(),
      styleId || "more_natural",
      stylePrompt,
      {
        previousVersions: Array.isArray(previousVersions) ? previousVersions : [],
        conversationContext:
          typeof conversationContext === "string" ? conversationContext : undefined,
        dislikedTraits: Array.isArray(dislikedTraits) ? dislikedTraits : undefined,
        situationContext:
          typeof situationContext === "string" ? situationContext : undefined,
      }
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Improve message API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to improve message" },
      { status: 500 }
    );
  }
}
