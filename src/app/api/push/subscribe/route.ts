import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    await savePushSubscription(endpoint, keys.p256dh, keys.auth);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
