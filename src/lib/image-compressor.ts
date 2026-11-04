/**
 * Client-Side Image Compressor for Mobile Screenshots
 * Resizes huge mobile screenshots down to optimal dimensions (max 1280px)
 * and compresses JPEG/WEBP, reducing base64 payload size by up to 90%
 * while preserving crystal-clear text readability for Gemini multimodal vision.
 */

export interface CompressedImage {
  data: string; // Base64 data URL
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  filename: string;
}

export async function compressScreenshotFile(
  file: File,
  maxDimension = 1440,
  quality = 0.85
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-preserving dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        // Draw with high quality interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG for high text contrast & small payload
        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const compressedBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          data: dataUrl,
          mimeType,
          originalSize: file.size,
          compressedSize: compressedBytes,
          width,
          height,
          filename: file.name,
        });
      };

      img.onerror = () => {
        reject(new Error(`Failed to decode image file: ${file.name}`));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}
