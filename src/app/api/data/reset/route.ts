import { NextRequest, NextResponse } from "next/server";
import { resetData } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target } = body; // 'chat' | 'all'

    if (target === "chat") {
      await resetData("chat");
      return NextResponse.json({ success: true, message: "Chat conversations cleared." });
    }

    if (target === "all") {
      await resetData("all");
      return NextResponse.json({ success: true, message: "Chat and reminder logs reset." });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
