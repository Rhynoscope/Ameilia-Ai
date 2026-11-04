import { NextResponse } from "next/server";
import { testGeminiConnection, getGeminiModel, getGeminiApiKey } from "@/lib/gemini";

export async function GET() {
  const result = await testGeminiConnection();
  const hasKey = Boolean(getGeminiApiKey() && getGeminiApiKey() !== "your_gemini_api_key_here");
  return NextResponse.json({
    ...result,
    configured: hasKey,
    model: getGeminiModel(),
  });
}

export async function POST() {
  const result = await testGeminiConnection();
  return NextResponse.json(result);
}
