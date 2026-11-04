import { NextRequest, NextResponse } from "next/server";
import { addImportantDate, deleteImportantDate, getImportantDates } from "@/lib/db";

export async function GET() {
  try {
    const dates = await getImportantDates();
    return NextResponse.json({ dates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, event_date, category, reminder_days_before, notes, is_recurring_yearly } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: "Title and event date are required" }, { status: 400 });
    }

    const newDate = await addImportantDate({
      title,
      event_date,
      category: category || "special_occasion",
      reminder_days_before: Number(reminder_days_before ?? 7),
      notes,
      is_recurring_yearly: Boolean(is_recurring_yearly),
    });

    return NextResponse.json({ date: newDate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await deleteImportantDate(Number(id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
