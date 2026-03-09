import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { uploadImageBytesToCloudinary } from "../_shared/cloudinary.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";
import {
  BudgetError,
  enforceRateLimitOrThrow,
  enforceTokenBudgetOrThrow,
  resolveCallerIdentity,
} from "../_shared/ai-budget.ts";
import { GeminiProviderError, generateGeminiImage } from "../_shared/gemini-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMITS = {
  rpm: 5,
  rpd: 20,
};

const TOKEN_LIMITS = {
  tpm: 250_000,
};

const WINDOW_SECONDS = {
  rpm: 60,
  rpd: 86_400,
  tpm: 3_600,
};

const TOKEN_ESTIMATE_PER_IMAGE = 1_200;
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

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

function normalizeRequestedModel(bodyModel: unknown): string | null {
  const raw = `${bodyModel || ""}`.trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith("gemini-")) return raw;
  return null;
}

async function enforceImageBudgets(supabase: any, callerKey: string, estimatedTokens: number): Promise<void> {
  const globalPrefix = "generate-image:global";
  const callerPrefix = `generate-image:${callerKey}`;

  await enforceRateLimitOrThrow(supabase, `${globalPrefix}:rpm`, RATE_LIMITS.rpm, WINDOW_SECONDS.rpm);
  await enforceRateLimitOrThrow(supabase, `${globalPrefix}:rpd`, RATE_LIMITS.rpd, WINDOW_SECONDS.rpd);
  await enforceRateLimitOrThrow(supabase, `${callerPrefix}:rpm`, RATE_LIMITS.rpm, WINDOW_SECONDS.rpm);
  await enforceRateLimitOrThrow(supabase, `${callerPrefix}:rpd`, RATE_LIMITS.rpd, WINDOW_SECONDS.rpd);

  await enforceTokenBudgetOrThrow(supabase, `${globalPrefix}:tpm`, TOKEN_LIMITS.tpm, estimatedTokens, WINDOW_SECONDS.tpm);
  await enforceTokenBudgetOrThrow(supabase, `${callerPrefix}:tpm`, TOKEN_LIMITS.tpm, estimatedTokens, WINDOW_SECONDS.tpm);
}

async function enforceTokenDelta(supabase: any, callerKey: string, extraTokens: number): Promise<void> {
  if (extraTokens <= 0) return;
  const globalPrefix = "generate-image:global";
  const callerPrefix = `generate-image:${callerKey}`;

  await enforceTokenBudgetOrThrow(supabase, `${globalPrefix}:tpm`, TOKEN_LIMITS.tpm, extraTokens, WINDOW_SECONDS.tpm);
  await enforceTokenBudgetOrThrow(supabase, `${callerPrefix}:tpm`, TOKEN_LIMITS.tpm, extraTokens, WINDOW_SECONDS.tpm);
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

    const requestedModel = normalizeRequestedModel(body?.model);
    const model = requestedModel || `${Deno.env.get("GEMINI_IMAGE_MODEL") || DEFAULT_GEMINI_IMAGE_MODEL}`.trim();
    if (!model) throw new HttpError(500, "Gemini image model is not configured.");

    const GEMINI_API_KEY = getEnv("GEMINI_API_KEY");
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
    if (uploadToCdn && (!CLOUD_NAME || !UPLOAD_PRESET)) {
      throw new HttpError(500, "Cloudinary is not configured for upload_to_cloudinary=true.");
    }

    const supabase = createServiceClient();
    const callerIdentity = resolveCallerIdentity(req);
    const callerKey = callerIdentity.key;

    await enforceImageBudgets(supabase, callerKey, TOKEN_ESTIMATE_PER_IMAGE);

    const promptContext = extractPromptContext((body || {}) as Record<string, unknown>);
    const inferredComponents = inferDomainComponents(promptContext);
    const requestedComponents = dedupeStrings(promptContext.components, 8);
    const visualComponents = dedupeStrings([...requestedComponents, ...inferredComponents, ...promptContext.keywords.slice(0, 4)], 8);
    const contextLine = visualComponents.length ? `Use visual components: ${visualComponents.join(", ")}.` : "";
    const finalPrompt = buildLowCostImagePrompt(prompt, contextLine);

    const gemini = await generateGeminiImage({
      apiKey: GEMINI_API_KEY,
      model,
      prompt: finalPrompt,
      width,
      height,
      maxRetries: 1,
    });

    const effectiveTokens = Math.max(TOKEN_ESTIMATE_PER_IMAGE, Number(gemini.usageTokens || 0));
    const extraTokens = Math.max(0, effectiveTokens - TOKEN_ESTIMATE_PER_IMAGE);
    await enforceTokenDelta(supabase, callerKey, extraTokens);

    let url = "";
    let uploadedToCloudinary = false;

    if (uploadToCdn) {
      url = await uploadImageBytesToCloudinary(gemini.imageBytes, gemini.mimeType, CLOUD_NAME, UPLOAD_PRESET);
      uploadedToCloudinary = true;
    } else {
      url = `data:${gemini.mimeType};base64,${gemini.base64Data}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        candidates: [url],
        uploaded_to_cloudinary: uploadedToCloudinary,
        provider: "gemini",
        model: gemini.model,
        usage_tokens: effectiveTokens,
        usage_metadata: gemini.usageMetadata,
        prompt: finalPrompt,
        visual_components_used: visualComponents,
        requested_model: body?.model || null,
        best_of_requested: requestedBestOf,
        best_of_effective: bestOf,
        limiter: {
          caller_key: callerKey,
          limits: {
            rpm: RATE_LIMITS.rpm,
            rpd: RATE_LIMITS.rpd,
            tpm: TOKEN_LIMITS.tpm,
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

    if (err instanceof GeminiProviderError) {
      return new Response(JSON.stringify({ error: `Gemini upstream error: ${err.message}` }), {
        status: 502,
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
