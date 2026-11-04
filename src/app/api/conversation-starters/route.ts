import { NextRequest, NextResponse } from "next/server";
import { generateConversationStarters } from "@/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "random";
    const includeMemories = searchParams.get("memories") !== "false";

    const starters = await generateConversationStarters(category, includeMemories);
    return NextResponse.json({ starters });
  } catch (err: any) {
    console.error("Starters API error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate starters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category = "random", includeMemories = true } = body;
    const starters = await generateConversationStarters(category, includeMemories);
    return NextResponse.json({ starters });
  } catch (err: any) {
    console.error("Starters API error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate starters" }, { status: 500 });
  }
}
