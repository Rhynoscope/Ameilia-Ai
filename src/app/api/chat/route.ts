import { NextRequest, NextResponse } from "next/server";
import { chatWithAmeliaAI } from "@/lib/gemini";
import {
  archiveAllConversations,
  createConversation,
  deleteAllConversations,
  getConversationMessages,
  getConversations,
  saveMessage,
} from "@/lib/db";
import { ChatAttachment, ThinkingMode } from "@/lib/types";

export const maxDuration = 60; // Allow 60 seconds for video or audio multimodal processing

function generateConversationTitle(prompt: string, attachments?: ChatAttachment[]): string {
  const lower = prompt.toLowerCase();
  if (attachments && attachments.length > 0) {
    const first = attachments[0];
    if (first.category === "audio") return "🎙️ Voice Note from Amelia";
    if (first.category === "video") return "🎬 Video from Amelia";
    if (first.category === "image") {
      if (lower.includes("screenshot")) return "📱 Chat Screenshot Analysis";
      if (lower.includes("selfie")) return "📸 Amelia's Selfie Reply";
      return "📸 Photo from Amelia";
    }
  }

  if (lower.includes("miss")) return "🥺 Missing Amelia";
  if (lower.includes("date") || lower.includes("virtual")) return "🎮 Virtual Date Planning";
  if (lower.includes("apolog") || lower.includes("sorry")) return "🕊️ Sincere Apology";
  if (lower.includes("morning")) return "🌅 Good Morning Text";
  if (lower.includes("night") || lower.includes("sleep")) return "✨ Good Night Message";
  if (lower.includes("flirt") || lower.includes("teas")) return "😉 Flirty Banter";
  if (lower.includes("advice") || lower.includes("help")) return "💡 Relationship Advice";
  if (lower.includes("starter") || lower.includes("start")) return "💬 Conversation Starters";

  const firstSentence = prompt.split(/[.?!]/)[0].trim();
  if (firstSentence.length > 0) {
    return firstSentence.length > 40 ? firstSentence.slice(0, 37) + "..." : firstSentence;
  }
  return "Conversation with Amelia AI";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const archived = searchParams.get("archived") === "true";
    const search = searchParams.get("search") || undefined;

    const convos = await getConversations({ includeArchived: archived, search });
    return NextResponse.json({ conversations: convos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId,
      message,
      attachments,
      preferences,
      thinkingMode,
    } = body;

    const hasText = Boolean(message && typeof message === "string" && message.trim().length > 0);
    const hasAttachments = Boolean(attachments && Array.isArray(attachments) && attachments.length > 0);

    if (!hasText && !hasAttachments) {
      return NextResponse.json(
        { error: "A message or at least one attachment is required." },
        { status: 400 }
      );
    }

    const convId = conversationId || `conv_${Date.now()}`;
    const userPrompt = (message || "").trim();

    // Ensure conversation exists in DB
    const existingMessages = await getConversationMessages(convId);
    if (existingMessages.length === 0) {
      const title = generateConversationTitle(userPrompt, attachments);
      await createConversation(convId, title);
    }

    // Save user message with attachments & thinking mode
    await saveMessage(convId, "user", userPrompt, undefined, attachments, undefined, thinkingMode as ThinkingMode);

    // Build context history
    const history = existingMessages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      attachments: m.attachments as ChatAttachment[] | undefined,
    }));
    history.push({
      role: "user",
      content: userPrompt,
      attachments: attachments as ChatAttachment[] | undefined,
    });

    // Call unified Amelia AI engine with thinkingMode
    const result = await chatWithAmeliaAI(history, attachments, preferences, thinkingMode as ThinkingMode);

    // Save assistant response
    await saveMessage(
      convId,
      "assistant",
      result.reply,
      result.suggestedReplies,
      undefined,
      result.suggestedMemories,
      thinkingMode as ThinkingMode
    );

    return NextResponse.json({
      conversationId: convId,
      reply: result.reply,
      suggestedReplies: result.suggestedReplies,
      suggestedMemories: result.suggestedMemories,
      isDemo: result.isDemo,
      thinkingMode: thinkingMode || "normal",
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process chat with Amelia AI" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await deleteAllConversations();
    return NextResponse.json({ success: true, message: "All conversations permanently deleted." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, archived } = body;
    if (action === "archive_all") {
      await archiveAllConversations(Boolean(archived));
      return NextResponse.json({ success: true, message: "All conversations updated." });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
