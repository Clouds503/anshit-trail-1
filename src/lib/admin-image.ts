import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/edge-functions";

export interface GenerateImageOptions {
  width?: number;
  height?: number;
  model?: string;
  uploadToCloudinary?: boolean;
}

interface PromptContextOptions {
  subject: string;
  details?: Array<string | null | undefined>;
}

type CloudinaryConfig = {
  cloudName: string;
  uploadPreset: string;
};

function isNetworkTransportError(message: string): boolean {
  return /failed to fetch|failed to send a request|network request failed|err_network_changed|err_connection_reset|err_name_not_resolved/i.test(
    message,
  );
}

function parseSettingValue(value: any): string {
  if (typeof value !== "string") return String(value || "");
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : String(parsed ?? "");
  } catch {
    return value;
  }
}

async function getCloudinaryConfig(): Promise<CloudinaryConfig> {
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("*")
    .in("key", ["cloudinary_cloud_name", "cloudinary_upload_preset"]);

  if (error) throw new Error(error.message || "Failed to load Cloudinary settings");

  let cloudName = "";
  let uploadPreset = "";

  (data || []).forEach((row: any) => {
    const value = parseSettingValue(row.value);
    if (row.key === "cloudinary_cloud_name") cloudName = value;
    if (row.key === "cloudinary_upload_preset") uploadPreset = value;
  });

  return { cloudName, uploadPreset };
}

export async function uploadImageFileToCloudinary(file: File): Promise<string> {
  const { cloudName, uploadPreset } = await getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error("Set Cloudinary Cloud Name and Upload Preset in Settings first");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const body = await res.json();
  if (!res.ok || !body.secure_url) {
    throw new Error(body?.error?.message || "Image upload failed");
  }

  return body.secure_url;
}

export async function generateImageFromPrompt(prompt: string, options: GenerateImageOptions = {}): Promise<string> {
  const payload = {
    prompt,
    width: options.width || 1200,
    height: options.height || 630,
    model: options.model || "flux",
    upload_to_cloudinary: options.uploadToCloudinary !== false,
    best_of: 4,
  };

  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await invokeAdminFunction<{ url?: string }>("generate-image", { body: payload });
      if (!data?.url) throw new Error("Image generation returned no URL");
      return data.url as string;
    } catch (err: any) {
      lastError = err;
      console.error("generate-image attempt", attempt + 1, "error:", err);
      const msg = String(err?.message || err);
      if (isNetworkTransportError(msg)) {
        const supabaseHost = (() => {
          try {
            return new URL(String(import.meta.env.VITE_SUPABASE_URL || "")).host || "unknown-host";
          } catch {
            return "unknown-host";
          }
        })();
        throw new Error(
          `Cannot reach Supabase endpoint (${supabaseHost}). Check internet, DNS/VPN/firewall, and VITE_SUPABASE_URL.`,
        );
      }
      // if client-side issue or 4xx, don't retry
      if (/4\d{2}|bad request|unauthorized|forbidden|non-2xx/i.test(msg)) break;
      // backoff
      await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }

  throw new Error(lastError?.message || "Image generation failed after retries");
}

export function buildMasterImagePrompt(options: PromptContextOptions): string {
  const detailText = (options.details || [])
    .map((item) => `${item || ""}`.trim())
    .filter(Boolean)
    .join(" | ")
    .slice(0, 600);

  return [
    `Create a premium cinematic 3D website image for: ${options.subject}.`,
    detailText ? `Context: ${detailText}.` : "",
    "Use realistic materials, depth layering, and clean visual hierarchy.",
    "No logos, no watermarks, no random glyphs, and no non-English text.",
    "No readable text of any kind: no words, letters, numbers, captions, or UI labels.",
    "Avoid screens, posters, documents, and signage.",
  ]
    .filter(Boolean)
    .join(" ");
}
