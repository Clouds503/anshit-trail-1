import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { uploadImageBytesToCloudinary } from "../_shared/cloudinary.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  BudgetError,
  enforceRateLimitOrThrow,
  resolveCallerIdentity,
} from "../_shared/ai-budget.ts";
import { buildPollinationsImageUrl } from "../_shared/pollinations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMITS = {
  rpm: 5,
  rpd: 20,
};

const WINDOW_SECONDS = {
  rpm: 60,
  rpd: 86_400,
};

const DEFAULT_POLLINATIONS_MODEL = "flux";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type PromptContext = {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  sectionTitle: string;
  audience: string;
  keywords: string[];
  components: string[];
};

function toCleanString(value: unknown, maxLength = 280): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function toCleanArray(value: unknown, maxItems = 12, maxItemLength = 90): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toCleanString(item, maxItemLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => toCleanString(item, maxItemLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  return [];
}

function dedupeStrings(items: string[], maxItems = 12): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const normalized = item.toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item);
    if (output.length >= maxItems) break;
  }
  return output;
}

function extractPromptContext(body: Record<string, unknown>): PromptContext {
  return {
    title: toCleanString(body.title, 180),
    shortDescription: toCleanString(body.short_description ?? body.excerpt, 260),
    description: toCleanString(body.description ?? body.long_description ?? body.content, 600),
    category: toCleanString(body.category, 120),
    sectionTitle: toCleanString(body.section_title ?? body.section, 140),
    audience: toCleanString(body.audience, 180),
    keywords: toCleanArray(body.keywords ?? body.seo_keywords, 14, 70),
    components: toCleanArray(body.visual_components ?? body.components, 14, 70),
  };
}

function inferDomainComponents(context: PromptContext): string[] {
  const corpus = [
    context.title,
    context.shortDescription,
    context.description,
    context.category,
    context.sectionTitle,
    context.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const output: string[] = [];
  const push = (...items: string[]) => output.push(...items);

  if (/cloud|aws|azure|gcp|kubernetes|docker|infra|devops/.test(corpus)) {
    push("cloud infrastructure nodes", "server racks", "network topology arcs");
  }
  if (/data|analytics|bi|tableau|power bi|sql/.test(corpus)) {
    push("3D data streams", "analytic chart shapes", "database cylinder clusters");
  }
  if (/cyber|security|soc|threat|firewall/.test(corpus)) {
    push("shield interfaces", "secure lock mechanisms", "threat defense visuals");
  }
  if (/salesforce|crm|customer|service cloud|sales cloud/.test(corpus)) {
    push("CRM workflow nodes", "customer journey flow paths");
  }
  if (/full stack|frontend|backend|web|application|app/.test(corpus)) {
    push("modular app architecture blocks", "API connection arcs", "deployment pipeline elements");
  }
  if (/ai|machine learning|ml|llm|neural/.test(corpus)) {
    push("neural lattice structures", "model training cubes", "AI pipeline connectors");
  }
  if (/training|course|program|learning|mentor|student/.test(corpus)) {
    push("mentor and learners collaboration scene", "training lab workspace components");
  }

  return dedupeStrings(output, 8);
}

function compactPrompt(value: string, maxLength = 950): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildLowCostImagePrompt(userPrompt: string, contextLine: string): string {
  return compactPrompt(
    [
      userPrompt,
      contextLine,
      "Create a premium cinematic 3D visual with realistic materials, clean depth, and one clear focal subject.",
      "No text, no letters, no numbers, no logos, no labels, no watermarks, no UI text.",
      "Avoid screens, dashboards, posters, signs, and documents.",
      "English visual context only.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function normalizeRequestedProvider(provider: unknown): "pollinations" | null {
  const raw = `${provider || ""}`.trim().toLowerCase();
  if (raw === "pollinations") return raw;
  return null;
}

function normalizePollinationsModel(model: unknown): string {
  const raw = `${model || ""}`.trim().toLowerCase();
  if (!raw) return DEFAULT_POLLINATIONS_MODEL;
  return raw;
}

async function enforceRequestBudgets(supabase: any, callerKey: string): Promise<void> {
  const globalPrefix = "generate-image:global";
  const callerPrefix = `generate-image:${callerKey}`;

  await enforceRateLimitOrThrow(supabase, `${globalPrefix}:rpm`, RATE_LIMITS.rpm, WINDOW_SECONDS.rpm);
  await enforceRateLimitOrThrow(supabase, `${globalPrefix}:rpd`, RATE_LIMITS.rpd, WINDOW_SECONDS.rpd);
  await enforceRateLimitOrThrow(supabase, `${callerPrefix}:rpm`, RATE_LIMITS.rpm, WINDOW_SECONDS.rpm);
  await enforceRateLimitOrThrow(supabase, `${callerPrefix}:rpd`, RATE_LIMITS.rpd, WINDOW_SECONDS.rpd);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = toCleanString(body?.prompt, 700);
    const width = Number(body?.width) || 1200;
    const height = Number(body?.height) || 630;
    const uploadToCdn = body?.upload_to_cloudinary !== false;
    const requestedBestOf = Number(body?.best_of) || 1;
    const bestOf = 1;

    if (!prompt) throw new HttpError(400, "prompt is required");

    const pollinationsModel = normalizePollinationsModel(body?.model);
    const POLLINATIONS_API_KEY =
      Deno.env.get("POLLINATION_API_KEY") ||
      Deno.env.get("POLLINATIONS_API_KEY") ||
      Deno.env.get("POLLINATION_KEY") ||
      "";
    const requestedProvider = normalizeRequestedProvider(body?.provider);
    const configuredProvider = normalizeRequestedProvider(Deno.env.get("IMAGE_PROVIDER"));
    const provider = requestedProvider || configuredProvider || "pollinations";

    if (provider !== "pollinations") {
      throw new HttpError(400, "Only provider='pollinations' is supported.");
    }
    if (!POLLINATIONS_API_KEY) {
      throw new HttpError(500, "POLLINATION_API_KEY is not configured.");
    }

    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
    if (uploadToCdn && (!CLOUD_NAME || !UPLOAD_PRESET)) {
      throw new HttpError(500, "Cloudinary is not configured for upload_to_cloudinary=true.");
    }

    const supabase = createServiceClient();
    const callerIdentity = resolveCallerIdentity(req);
    const callerKey = callerIdentity.key;

    await enforceRequestBudgets(supabase, callerKey);

    const promptContext = extractPromptContext((body || {}) as Record<string, unknown>);
    const inferredComponents = inferDomainComponents(promptContext);
    const requestedComponents = dedupeStrings(promptContext.components, 8);
    const visualComponents = dedupeStrings([...requestedComponents, ...inferredComponents, ...promptContext.keywords.slice(0, 4)], 8);
    const contextLine = visualComponents.length ? `Use visual components: ${visualComponents.join(", ")}.` : "";
    const finalPrompt = buildLowCostImagePrompt(prompt, contextLine);

    let url = "";
    let uploadedToCloudinary = false;
    const effectiveTokens = 0;
    let modelUsed = "";
    let usageMetadata: Record<string, unknown> = {};

    const pollinationsUrl = buildPollinationsImageUrl(finalPrompt, {
      width,
      height,
      model: pollinationsModel,
      nologo: true,
      seed: Math.floor(Math.random() * 1000000000),
      apiKey: POLLINATIONS_API_KEY,
    });

    const probe = await fetch(pollinationsUrl);
    if (!probe.ok) {
      const raw = await probe.text().catch(() => "");
      let message = raw;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        const parsedMessage =
          parsed?.error?.message?.toString?.() ||
          parsed?.error?.toString?.() ||
          parsed?.message?.toString?.();
        if (parsedMessage) message = parsedMessage;
      } catch {
        // Keep raw text.
      }
      const status = probe.status === 402 ? 429 : 502;
      throw new HttpError(status, `Pollinations upstream error: ${message || `status ${probe.status}`}`);
    }

    const rawContentType = (probe.headers.get("content-type") || "").trim().toLowerCase();
    const mimeType = rawContentType.split(";")[0] || "image/png";
    if (!mimeType.includes("image")) {
      const raw = await probe.text().catch(() => "");
      throw new HttpError(502, `Pollinations did not return an image payload: ${raw || "unknown response"}`);
    }

    const imageBytes = new Uint8Array(await probe.arrayBuffer());
    if (!imageBytes.length) throw new HttpError(502, "Pollinations returned an empty image payload.");

    modelUsed = pollinationsModel;
    usageMetadata = { source: "pollinations" };

    if (uploadToCdn) {
      url = await uploadImageBytesToCloudinary(imageBytes, mimeType, CLOUD_NAME, UPLOAD_PRESET);
      uploadedToCloudinary = true;
    } else {
      url = `data:${mimeType};base64,${bytesToBase64(imageBytes)}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        candidates: [url],
        uploaded_to_cloudinary: uploadedToCloudinary,
        provider,
        model: modelUsed,
        usage_tokens: effectiveTokens,
        usage_metadata: usageMetadata,
        prompt: finalPrompt,
        visual_components_used: visualComponents,
        requested_model: body?.model || null,
        requested_provider: body?.provider || null,
        best_of_requested: requestedBestOf,
        best_of_effective: bestOf,
        limiter: {
          caller_key: callerKey,
          limits: {
            rpm: RATE_LIMITS.rpm,
            rpd: RATE_LIMITS.rpd,
          },
          window_seconds: WINDOW_SECONDS,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof BudgetError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err || "Unknown error");
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
