import { NextResponse } from "next/server";
import { getDatabaseType, isD1Active } from "@/lib/db";
import { isR2Available } from "@/lib/r2";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini";

export async function GET() {
  const apiKey = getGeminiApiKey();
  const hasKey = Boolean(apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here");
  const uptimeSeconds = typeof process !== "undefined" && typeof process.uptime === "function" ? process.uptime() : null;

  return NextResponse.json({
    status: "ok",
    service: "amelia-assistant",
    platform: isD1Active() || isR2Available() ? "cloudflare" : "node",
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    database: getDatabaseType(),
    storage: {
      r2: isR2Available(),
    },
    gemini: {
      configured: hasKey,
      model: getGeminiModel(),
    },
  });
}
