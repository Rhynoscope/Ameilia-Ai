import { NextRequest, NextResponse } from "next/server";
import { addMemory, deleteMemory, getMemories, updateMemory } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    const memories = await getMemories(search, category);
    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const { category, title, content, emotional_significance, approx_date, status, source_type, related_keys, source } = body;

    if (!category || !title || !content) {
      return NextResponse.json(
        { error: "Category, title, and content are required." },
        { status: 400 }
      );
    }

    const memory = await addMemory({
      category,
      title,
      content,
      emotional_significance,
      approx_date,
      status: status || "confirmed",
      source_type: source_type || "her_statement",
      related_keys,
      source: source || "manual",
    });

    return NextResponse.json({ memory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: any = await req.json();
    const { id, category, title, content, emotional_significance, approx_date, status, source_type, related_keys } = body;

    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    await updateMemory(id, {
      category,
      title,
      content,
      emotional_significance,
      approx_date,
      status,
      source_type,
      related_keys
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    await deleteMemory(Number(id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
