const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

const CLOUDINARY_HOST_RE = /(^https?:\/\/)?res\.cloudinary\.com\//i;

function splitUrl(url: string) {
  const [base, query] = url.split("?");
  return { base, query: query ? `?${query}` : "" };
}

function injectCloudinaryTransform(url: string, transform: string): string {
  const { base, query } = splitUrl(url);
  const uploadIndex = base.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (uploadIndex === -1) return url;

  const prefix = base.slice(0, uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length);
  const suffix = base.slice(uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length).replace(/^\/+/, "");
  return `${prefix}${transform}/${suffix}${query}`;
}

export function isCloudinaryImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return CLOUDINARY_HOST_RE.test(url.trim());
}

export function getOptimizedImageUrl(
  rawUrl?: string | null,
  options?: { width?: number; quality?: string; fit?: "limit" | "fill" | "fit" },
): string {
  const url = `${rawUrl || ""}`.trim();
  if (!url) return "";
  if (!isCloudinaryImageUrl(url)) return url;

  const width = Math.max(120, Math.round(options?.width || 1200));
  const quality = `${options?.quality || "auto"}`.trim() || "auto";
  const fitMode = options?.fit || "limit";
  const crop = fitMode === "fill" ? "c_fill" : fitMode === "fit" ? "c_fit" : "c_limit";
  const transform = `f_auto,q_${quality},dpr_auto,w_${width},${crop}`;

  return injectCloudinaryTransform(url, transform);
}

export function getOptimizedImageSrcSet(
  rawUrl?: string | null,
  widths: number[] = [320, 480, 640, 768, 960, 1200, 1600],
): string | undefined {
  const url = `${rawUrl || ""}`.trim();
  if (!url || !isCloudinaryImageUrl(url)) return undefined;

  const uniqueWidths = Array.from(new Set(widths.filter((w) => Number.isFinite(w) && w > 0))).sort((a, b) => a - b);
  if (uniqueWidths.length === 0) return undefined;

  return uniqueWidths.map((width) => `${getOptimizedImageUrl(url, { width, fit: "limit" })} ${width}w`).join(", ");
}
