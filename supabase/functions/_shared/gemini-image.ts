const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiImageGenerateOptions = {
  apiKey: string;
  model: string;
  prompt: string;
  width: number;
  height: number;
  maxRetries?: number;
};

export type GeminiImageResult = {
  imageBytes: Uint8Array;
  base64Data: string;
  mimeType: string;
  model: string;
  usageTokens: number;
  usageMetadata: Record<string, unknown>;
};

export class GeminiProviderError extends Error {
  status: number;
  retriable: boolean;
  constructor(message: string, status: number, retriable = false) {
    super(message);
    this.status = status;
    this.retriable = retriable;
  }
}

function toByteArrayFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function nearestAspectRatio(width: number, height: number): string {
  const value = width > 0 && height > 0 ? width / height : 16 / 9;
  const candidates: Array<{ name: string; ratio: number }> = [
    { name: "1:1", ratio: 1 },
    { name: "4:3", ratio: 4 / 3 },
    { name: "3:4", ratio: 3 / 4 },
    { name: "16:9", ratio: 16 / 9 },
    { name: "9:16", ratio: 9 / 16 },
  ];

  let best = candidates[0];
  let bestDistance = Math.abs(value - best.ratio);
  for (const candidate of candidates.slice(1)) {
    const distance = Math.abs(value - candidate.ratio);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best.name;
}

async function callGeminiOnce(options: GeminiImageGenerateOptions): Promise<GeminiImageResult> {
  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: nearestAspectRatio(options.width, options.height),
      },
    },
  };

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || "network error");
    throw new GeminiProviderError(`Gemini request failed: ${message}`, 502, true);
  }

  const raw = await res.text().catch(() => "");
  let body: any = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const providerMessage =
      body?.error?.message?.toString?.() ||
      body?.message?.toString?.() ||
      raw ||
      `Gemini error ${res.status}`;
    const retriable = res.status >= 500;
    throw new GeminiProviderError(providerMessage, res.status, retriable);
  }

  const parts = Array.isArray(body?.candidates?.[0]?.content?.parts) ? body.candidates[0].content.parts : [];
  const imagePart = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
  const inline = imagePart?.inlineData || imagePart?.inline_data || null;
  const base64Data = `${inline?.data || ""}`.trim();
  const mimeType = `${inline?.mimeType || inline?.mime_type || "image/png"}`.trim() || "image/png";
  if (!base64Data) {
    throw new GeminiProviderError("Gemini did not return image bytes.", 502, false);
  }

  const usageMetadata = (body?.usageMetadata || body?.usage_metadata || {}) as Record<string, unknown>;
  const usageTokens = Number(
    usageMetadata?.totalTokenCount ||
    usageMetadata?.total_token_count ||
    usageMetadata?.promptTokenCount ||
    usageMetadata?.prompt_token_count ||
    0,
  ) || 0;

  return {
    imageBytes: toByteArrayFromBase64(base64Data),
    base64Data,
    mimeType,
    model: options.model,
    usageTokens,
    usageMetadata,
  };
}

export async function generateGeminiImage(options: GeminiImageGenerateOptions): Promise<GeminiImageResult> {
  const retries = Math.max(0, Math.min(options.maxRetries ?? 1, 1));
  let lastError: GeminiProviderError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callGeminiOnce(options);
    } catch (err) {
      if (!(err instanceof GeminiProviderError)) {
        throw err;
      }
      lastError = err;
      if (!err.retriable || attempt >= retries) break;
    }
  }

  if (!lastError) {
    throw new GeminiProviderError("Gemini image generation failed.", 502, false);
  }
  throw lastError;
}
