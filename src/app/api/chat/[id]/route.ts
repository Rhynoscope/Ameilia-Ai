import { NextRequest, NextResponse } from "next/server";
import {
  archiveConversation,
  clearConversation,
  getConversationMessages,
  renameConversation,
} from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await getConversationMessages(id);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await clearConversation(id);
    return NextResponse.json({ success: true, message: "Conversation permanently deleted from database." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, archived } = body;

    if (typeof title === "string" && title.trim().length > 0) {
      await renameConversation(id, title.trim());
    }

    if (typeof archived === "boolean") {
      await archiveConversation(id, archived);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
