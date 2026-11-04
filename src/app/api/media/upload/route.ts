import { NextRequest, NextResponse } from "next/server";
import { isR2Available, uploadMediaToR2 } from "@/lib/r2";
import { SUPPORTED_MIME_TYPES } from "@/lib/media-handler";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle FormData upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const category = (formData.get("category") as string) || "image";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Safeguard: 50MB max limit
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 });
      }

      const mimeType = file.type || "application/octet-stream";
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const key = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const buffer = await file.arrayBuffer();

      if (isR2Available()) {
        const uploadResult = await uploadMediaToR2(key, buffer, mimeType, {
          originalName: file.name,
          category,
          size: String(file.size),
        });

        return NextResponse.json({
          success: true,
          storage: "r2",
          key: uploadResult.key,
          url: uploadResult.url,
          name: file.name,
          size: file.size,
          category,
          mimeType,
        });
      }

      // Fallback if R2 not bound
      const base64 = Buffer.from(buffer).toString("base64");
      return NextResponse.json({
        success: true,
        storage: "inline",
        name: file.name,
        size: file.size,
        category,
        mimeType,
        data: `data:${mimeType};base64,${base64}`,
      });
    }

    // Handle JSON base64 upload
    const body = await req.json();
    const { name, mimeType, category, data } = body;

    if (!data || !name) {
      return NextResponse.json({ error: "Name and data are required" }, { status: 400 });
    }

    const base64Clean = data.includes(",") ? data.split(",")[1] : data;
    const buffer = Buffer.from(base64Clean, "base64");

    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 });
    }

    const ext = name.split(".").pop()?.toLowerCase() || "bin";
    const key = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    if (isR2Available()) {
      const uploadResult = await uploadMediaToR2(key, buffer, mimeType || "application/octet-stream", {
        originalName: name,
        category: category || "image",
        size: String(buffer.length),
      });

      return NextResponse.json({
        success: true,
        storage: "r2",
        key: uploadResult.key,
        url: uploadResult.url,
        name,
        size: buffer.length,
        category: category || "image",
        mimeType: mimeType || "application/octet-stream",
      });
    }

    return NextResponse.json({
      success: true,
      storage: "inline",
      name,
      size: buffer.length,
      category: category || "image",
      mimeType: mimeType || "application/octet-stream",
      data,
    });
  } catch (err: any) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload media" }, { status: 500 });
  }
}
