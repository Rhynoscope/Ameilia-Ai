import { NextRequest, NextResponse } from "next/server";
import { getMediaFromR2 } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await context.params;
    if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
      return NextResponse.json({ error: "Invalid media key" }, { status: 400 });
    }

    const object = await getMediaFromR2(key);
    if (!object) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=86400, stale-while-revalidate=604800");
    headers.set("Content-Disposition", "inline");
    if (object.httpEtag) {
      headers.set("ETag", object.httpEtag);
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("Media retrieval error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve media" }, { status: 500 });
  }
}
