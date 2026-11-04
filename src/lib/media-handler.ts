import { ChatAttachment, MediaCategory } from "./types";
import { compressScreenshotFile } from "./image-compressor";

export const SUPPORTED_EXTENSIONS = {
  image: [".png", ".jpg", ".jpeg", ".webp"],
  audio: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".opus"],
  video: [".mp4", ".mov", ".webm", ".avi", ".mpeg", ".3gp"],
};

export const SUPPORTED_MIME_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/opus",
  // Videos
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
];

export function getMediaCategory(file: File): MediaCategory | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith("image/") || SUPPORTED_EXTENSIONS.image.some((ext) => name.endsWith(ext))) {
    return "image";
  }
  if (type.startsWith("audio/") || SUPPORTED_EXTENSIONS.audio.some((ext) => name.endsWith(ext))) {
    return "audio";
  }
  if (type.startsWith("video/") || SUPPORTED_EXTENSIONS.video.some((ext) => name.endsWith(ext))) {
    return "video";
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Process any uploaded file (image, audio, or video) into a ChatAttachment
 */
export async function processUploadedFile(file: File): Promise<ChatAttachment> {
  const category = getMediaCategory(file);
  if (!category) {
    throw new Error(
      `Unsupported file type: "${file.name}". Supported: PNG, JPG, JPEG, WEBP, MP3, WAV, M4A, AAC, OGG, FLAC, WEBM, MP4, MOV, AVI, MPEG, 3GP.`
    );
  }

  // 50MB file size safeguard for browser memory
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(`File "${file.name}" exceeds the 50MB size limit.`);
  }

  // If image, run smart canvas compression for fast uploading & low tokens
  if (category === "image") {
    const compressed = await compressScreenshotFile(file, 1440, 0.85);
    return {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: compressed.compressedSize,
      category: "image",
      mimeType: compressed.mimeType,
      data: compressed.data,
    };
  }

  // For audio & video, read as base64 Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let mimeType = file.type || "application/octet-stream";
      if (!file.type) {
        const name = file.name.toLowerCase();
        if (name.endsWith(".mp3")) mimeType = "audio/mpeg";
        else if (name.endsWith(".wav")) mimeType = "audio/wav";
        else if (name.endsWith(".m4a")) mimeType = "audio/m4a";
        else if (name.endsWith(".mp4")) mimeType = "video/mp4";
        else if (name.endsWith(".mov")) mimeType = "video/quicktime";
        else if (name.endsWith(".webm")) mimeType = category === "video" ? "video/webm" : "audio/webm";
      }

      resolve({
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        category,
        mimeType,
        data: reader.result as string,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}
