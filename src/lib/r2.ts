import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getR2Bucket(): any {
  try {
    const ctx = getCloudflareContext();
    return (ctx?.env as any)?.MEDIA_BUCKET || null;
  } catch {
    return null;
  }
}

export function isR2Available(): boolean {
  return Boolean(getR2Bucket());
}

/**
 * Upload a media file into Cloudflare R2 private bucket
 */
export async function uploadMediaToR2(
  key: string,
  data: ArrayBuffer | Uint8Array | ReadableStream,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<{ key: string; url: string }> {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error("Cloudflare R2 MEDIA_BUCKET binding is not available in current environment");
  }

  await bucket.put(key, data, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: "private, max-age=86400",
    },
    customMetadata: metadata,
  });

  return {
    key,
    url: `/api/media/${key}`,
  };
}

/**
 * Retrieve a media file from Cloudflare R2
 */
export async function getMediaFromR2(key: string): Promise<any | null> {
  const bucket = getR2Bucket();
  if (!bucket) return null;
  return bucket.get(key);
}

/**
 * Permanently delete media file(s) from Cloudflare R2
 */
export async function deleteMediaFromR2(keys: string | string[]): Promise<void> {
  const bucket = getR2Bucket();
  if (!bucket) return;
  const keyList = Array.isArray(keys) ? keys : [keys];
  await Promise.all(
    keyList
      .filter((k) => Boolean(k && k.trim()))
      .map((k) => bucket.delete(k.trim()))
  );
}
