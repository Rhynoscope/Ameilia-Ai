import { NextResponse } from "next/server";
import { getDatabaseType, isD1Active } from "@/lib/db";
import { isR2Available } from "@/lib/r2";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const apiKey = getGeminiApiKey();
  const hasKey = Boolean(apiKey && apiKey.trim() !== "" && apiKey !== "your_gemini_api_key_here");
  const uptimeSeconds = typeof process !== "undefined" && typeof process.uptime === "function" ? process.uptime() : null;

  let cfContextInfo: any = {};
  try {
    const ctx = getCloudflareContext();
    cfContextInfo = {
      hasCtx: true,
      envKeys: ctx?.env ? Object.keys(ctx.env) : [],
      hasDB: Boolean((ctx?.env as any)?.DB),
      hasR2: Boolean((ctx?.env as any)?.MEDIA_BUCKET),
    };
  } catch (e: any) {
    cfContextInfo = {
      hasCtx: false,
      error: e?.message || String(e),
      stack: e?.stack,
    };
  }

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
    cfContextInfo,
  });
}
