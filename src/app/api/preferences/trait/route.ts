import { NextRequest, NextResponse } from "next/server";
import {
  deleteResponseFeedback,
  deleteResponseFeedbackByTrait,
  getLearnedPreferences,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trait = searchParams.get("trait");
    const idParam = searchParams.get("id");

    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        await deleteResponseFeedback(id);
      }
    } else if (trait && trait.trim().length > 0) {
      await deleteResponseFeedbackByTrait(trait.trim());
    } else {
      // Also check json body if not in query params
      try {
        const body: any = await req.json();
        if (body.id) {
          await deleteResponseFeedback(Number(body.id));
        } else if (body.trait) {
          await deleteResponseFeedbackByTrait(String(body.trait).trim());
        } else {
          return NextResponse.json(
            { error: "Provide either 'trait' or 'id' to delete." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Provide either 'trait' or 'id' to delete." },
          { status: 400 }
        );
      }
    }

    const preferences = await getLearnedPreferences();
    return NextResponse.json({ success: true, preferences });
  } catch (err: any) {
    console.error("[Preferences Trait Delete error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to remove preference trait." },
      { status: 500 }
    );
  }
}
