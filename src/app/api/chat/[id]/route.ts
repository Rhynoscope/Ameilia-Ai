import { NextRequest, NextResponse } from "next/server";
import {
  archiveConversation,
  clearConversation,
  deleteMessage,
  editUserMessage,
  getConversationMessages,
  pinConversation,
  renameConversation,
  updateMessageContentAndReplies,
} from "@/lib/db";
import { chatWithAmeliaAI } from "@/lib/gemini";
import { ChatAttachment, ThinkingMode } from "@/lib/types";

export const maxDuration = 60;

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
    const { searchParams } = new URL(req.url);
    const messageIdParam = searchParams.get("messageId");

    if (messageIdParam) {
      const msgId = Number(messageIdParam);
      if (!Number.isFinite(msgId)) {
        return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
      }
      await deleteMessage(msgId);
      const remaining = await getConversationMessages(id);
      return NextResponse.json({
        success: true,
        deletedMessageId: msgId,
        messages: remaining,
      });
    }

    await clearConversation(id);
    return NextResponse.json({
      success: true,
      message: "Conversation permanently deleted from database.",
    });
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
    const body: any = await req.json();
    const {
      title,
      archived,
      pinned,
      action,
      messageId,
      content,
      suggestedReplies,
      versions,
      previousVersions,
      dislikedReason,
      preferences,
      thinkingMode,
    } = body;

    if (typeof title === "string" && title.trim().length > 0) {
      await renameConversation(id, title.trim());
    }

    if (typeof archived === "boolean") {
      await archiveConversation(id, archived);
    }

    if (typeof pinned === "boolean") {
      await pinConversation(id, pinned);
    }

    if (action === "edit_message" && messageId && typeof content === "string") {
      await editUserMessage(Number(messageId), content.trim());
      return NextResponse.json({ success: true });
    }

    if (action === "update_message" && messageId) {
      await updateMessageContentAndReplies(Number(messageId), {
        content,
        suggestedReplies,
        versions,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "regenerate_assistant" && messageId) {
      const allMessages = await getConversationMessages(id);
      const targetIdx = allMessages.findIndex(
        (m: any) => Number(m.id) === Number(messageId)
      );

      const historyUpToTarget =
        targetIdx > 0 ? allMessages.slice(0, targetIdx) : allMessages;

      const prevList: string[] = Array.isArray(previousVersions)
        ? previousVersions
        : [];
      const currentTarget = targetIdx >= 0 ? allMessages[targetIdx] : null;
      if (currentTarget?.content && !prevList.includes(currentTarget.content)) {
        prevList.push(currentTarget.content);
      }

      const historyForGemini = historyUpToTarget.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        attachments: m.attachments as ChatAttachment[] | undefined,
      }));

      // Append an explicit regeneration instruction to the last user turn so Gemini produces a genuinely fresh response
      const avoidNote = `\n\n[REGENERATION INSTRUCTION: Please generate a completely fresh, newly phrased response and a brand-new recommended text message that is distinctly different in wording, opening, and angle from these previous versions: ${prevList
        .map((p, idx) => `(${idx + 1}) "${p.slice(0, 220)}"`)
        .join(" | ")}${
        dislikedReason ? `. Avoid: ${dislikedReason}` : ""
      }]`;

      if (historyForGemini.length > 0) {
        const lastIdx = historyForGemini.length - 1;
        historyForGemini[lastIdx] = {
          ...historyForGemini[lastIdx],
          content: (historyForGemini[lastIdx].content || "") + avoidNote,
        };
      } else {
        historyForGemini.push({
          role: "user",
          content: "Give me a fresh suggestion for texting Amelia." + avoidNote,
          attachments: undefined,
        });
      }

      const lastUserWithAtt = [...historyUpToTarget]
        .reverse()
        .find((m: any) => m.role === "user" && m.attachments?.length > 0);

      const result = await chatWithAmeliaAI(
        historyForGemini,
        lastUserWithAtt?.attachments,
        preferences,
        (thinkingMode as ThinkingMode) || "normal"
      );

      const existingVersions = Array.isArray(currentTarget?.versions)
        ? currentTarget.versions
        : currentTarget
        ? [
            {
              content: currentTarget.content,
              suggested_replies: currentTarget.suggested_replies,
              created_at: currentTarget.created_at,
              label: "Version 1",
            },
          ]
        : [];

      const updatedVersions = [
        ...existingVersions,
        {
          content: result.reply,
          suggested_replies: result.suggestedReplies,
          created_at: new Date().toISOString(),
          label: `Version ${existingVersions.length + 1}`,
        },
      ];

      await updateMessageContentAndReplies(Number(messageId), {
        content: result.reply,
        suggestedReplies: result.suggestedReplies,
        versions: updatedVersions,
      });

      return NextResponse.json({
        success: true,
        reply: result.reply,
        suggestedReplies: result.suggestedReplies,
        suggestedMemories: result.suggestedMemories,
        versions: updatedVersions,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
