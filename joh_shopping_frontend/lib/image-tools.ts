/**
 * Browser-side image processing for the admin image manager: crop, rotate
 * and downscale with a canvas before uploading, so the API only ever stores
 * web-sized photos.
 */

/** What the API accepts (UploadController). */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_MAX_SIDE = 4000;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderOptions {
  /** Crop in the rotated image's pixel space (react-easy-crop's croppedAreaPixels). Null keeps the whole image. */
  area: PixelArea | null;
  rotation: number;
  /** Longest side of the result; never upscales. */
  maxSide: number;
  background: "white" | "transparent";
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

/** Size of the box that holds the image after rotating it. */
export function rotatedSize(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Final pixel size for a crop area at a given longest side. */
export function outputSize(area: { width: number; height: number }, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
  return {
    width: Math.max(1, Math.round(area.width * scale)),
    height: Math.max(1, Math.round(area.height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function renderImage(src: string, { area, rotation, maxSide, background }: RenderOptions): Promise<Blob> {
  const img = await loadImage(src);
  const box = rotatedSize(img.naturalWidth, img.naturalHeight, rotation);
  const crop = area ?? { x: 0, y: 0, ...box };
  const out = outputSize(crop, maxSide);
  const scale = out.width / crop.width;

  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  if (background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scale, scale);
  ctx.translate(-crop.x + box.width / 2, -crop.y + box.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  // WebP keeps transparency and is small. Browsers that can't encode it return PNG,
  // which is too heavy for an opaque photo, so use JPEG there.
  const webp = await toBlob(canvas, "image/webp", 0.9);
  if (webp?.type === "image/webp") return webp;
  const fallback = await toBlob(canvas, background === "white" ? "image/jpeg" : "image/png", 0.9);
  if (!fallback) throw new Error("encode_failed");
  return fallback;
}

/** A File for upload, named after the original with the right extension. */
export function blobToFile(blob: Blob, name: string): File {
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `${name.replace(/\.[^.]+$/, "") || "photo"}.${ext}`, {
    type: blob.type,
  });
}

/**
 * The original file when the API accepts it as is; otherwise a downscaled
 * copy (phone photos are often larger than 5 MB or 4000 px).
 */
export async function prepareOriginal(file: File, src: string): Promise<File> {
  const img = await loadImage(src);
  const fits = file.size <= UPLOAD_MAX_BYTES && UPLOAD_TYPES.includes(file.type) && Math.max(img.naturalWidth, img.naturalHeight) <= UPLOAD_MAX_SIDE;
  if (fits) return file;
  const blob = await renderImage(src, {
    area: null,
    rotation: 0,
    maxSide: 2000,
    background: file.type === "image/jpeg" ? "white" : "transparent",
  });
  return blobToFile(blob, file.name);
}
