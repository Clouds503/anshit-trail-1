import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPollinationsImageUrl } from "../_shared/pollinations.ts";
import { uploadImageToCloudinary } from "../_shared/cloudinary.ts";
import { parseAIJson } from "../_shared/parse-ai-json.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_SYSTEM_PROMPT = `You are a principal-level visual prompt engineer for premium 3D commercial imagery.
Convert user intent into a concise, production-ready prompt for image generation.
Output one single prompt line only, in English.
Never request text overlays, headings, letters, words, or typography in the image.`;

type PromptContext = {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  sectionTitle: string;
  audience: string;
  keywords: string[];
  highlights: string[];
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

function dedupeStrings(items: string[], maxItems = 16): string[] {
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
    highlights: toCleanArray(body.highlights, 12, 90),
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
    context.highlights.join(" "),
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
    push("shield interfaces", "secure lock mechanisms", "threat grid overlays without text");
  }
  if (/salesforce|crm|customer|service cloud|sales cloud/.test(corpus)) {
    push("CRM workflow nodes", "customer journey flow paths", "pipeline process components");
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

  return dedupeStrings(output, 10);
}

function buildContextSummary(context: PromptContext, components: string[]): string {
  const lines = [
    context.title ? `Title: ${context.title}` : "",
    context.shortDescription ? `Short description: ${context.shortDescription}` : "",
    context.description ? `Detailed description: ${context.description}` : "",
    context.category ? `Category: ${context.category}` : "",
    context.sectionTitle ? `Section: ${context.sectionTitle}` : "",
    context.audience ? `Audience: ${context.audience}` : "",
    context.keywords.length ? `Keywords: ${context.keywords.join(", ")}` : "",
    context.highlights.length ? `Highlights: ${context.highlights.join(", ")}` : "",
    components.length ? `Visual components to include: ${components.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return lines.slice(0, 2200);
}

function buildHighEnd3DPrompt(prompt: string): string {
  return [
    prompt,
    "Create a premium cinematic 3D visual with realistic materials, layered depth, and polished lighting.",
    "Use one clear focal subject and clean composition.",
    "The image must contain zero readable text: no words, no letters, no numbers, no logos, no watermarks, no captions, no UI text.",
    "Use visual components and props that directly map to title, short description, long description, and keywords.",
    "Avoid signs, banners, posters, and readable screen content.",
  ].join(" ");
}

function compactPrompt(value: string, maxLength = 1100): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function isUsableImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("image")) return false;

    const bytes = await res.arrayBuffer();
    return bytes.byteLength > 8_000;
  } catch {
    return false;
  }
}

async function hasReadableText(url: string, groqApiKey: string): Promise<boolean> {
  if (!groqApiKey) return false;

  const detectWithModel = async (model: string): Promise<boolean> => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Return ONLY JSON object {\"has_text\": true|false}. Set has_text=true when any readable or prominent text-like artifact is visible (words, letters, numbers, logos, labels, captions, watermark, UI text, or gibberish text).",
              },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
    });

    if (!res.ok) throw new Error(`vision model failed: ${model}`);

    const data = await res.json().catch(() => null);
    const raw = data?.choices?.[0]?.message?.content?.toString?.() || "";
    const parsed = parseAIJson(raw);
    return parsed?.has_text === true;
  };

  let scout: boolean | null = null;
  let maverick: boolean | null = null;

  try {
    scout = await detectWithModel("meta-llama/llama-4-scout-17b-16e-instruct");
  } catch {
    // Keep going with the second model.
  }

  try {
    maverick = await detectWithModel("meta-llama/llama-4-maverick-17b-128e-instruct");
  } catch {
    // Keep going with available signal.
  }

  // Reject only on strong agreement to reduce false positives.
  if (scout === true && maverick === true) return true;
  if (scout === null && maverick === null) return false;
  return false;
}

function candidatePrompt(basePrompt: string, attempt: number): string {
  if (attempt === 0) return `${basePrompt} Avoid screens and UI panels.`;
  if (attempt === 1) return `${basePrompt} No text anywhere. No letters. No numbers. No symbols.`;
  return `${basePrompt} Avoid monitors, dashboards, documents, posters, labels, and any readable symbols. Use abstract props only.`;
}

async function rewritePromptWithGroq(
  userPrompt: string,
  groqApiKey: string,
  context: PromptContext,
  components: string[],
): Promise<string> {
  if (!groqApiKey) return userPrompt;

  const contextSummary = buildContextSummary(context, components);

  const rewritePrompt = `Rewrite the following request into one advanced cinematic 3D image generation prompt.

User request:
${userPrompt}

Structured context data:
${contextSummary || "No extra context provided."}

Requirements:
- Keep meaning accurate.
- English only.
- No text overlays or typography in final image.
- Mention realistic materials, lighting, depth, composition, and subject arrangement.
- Reflect BOTH short and long description context in the scene.
- Use non-text visual components only, aligned to provided fields.
- Return exactly one prompt sentence, no markdown fences.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        { role: "user", content: rewritePrompt },
      ],
      temperature: 0.35,
      max_tokens: 350,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Groq rewrite failed:", res.status, err);
    return userPrompt;
  }

  const data = await res.json().catch(() => null);
  const rewritten = data?.choices?.[0]?.message?.content?.toString?.().trim?.();
  return rewritten || userPrompt;
}

function randomSeed() {
  return Math.floor(Math.random() * 1000000000);
}

async function getAvailablePollinationsImageModels(): Promise<string[]> {
  try {
    const res = await fetch("https://image.pollinations.ai/models");
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) return [];
    return dedupeStrings(
      data
        .map((item) => toCleanString(item, 50).toLowerCase())
        .filter(Boolean),
      12,
    );
  } catch {
    return [];
  }
}

function buildModelPool(requestedModel: string, availableModels: string[]): string[] {
  const preferredFallbacks = ["turbo", "sana", "zimage"];
  const requested = toCleanString(requestedModel, 50).toLowerCase();

  if (availableModels.length === 0) {
    return dedupeStrings([requested || "flux", ...preferredFallbacks], 6);
  }

  const available = new Set(availableModels.map((m) => m.toLowerCase()));
  const pool: string[] = [];

  if (requested && available.has(requested)) pool.push(requested);
  for (const model of preferredFallbacks) {
    if (available.has(model)) pool.push(model);
  }
  if (pool.length === 0) {
    pool.push(...availableModels.slice(0, 3));
  }

  return dedupeStrings(pool, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const prompt = (body?.prompt || "").toString().trim();
    const width = Number(body?.width) || 1200;
    const height = Number(body?.height) || 630;
    const model = (body?.model || "flux").toString();
    const uploadToCdn = body?.upload_to_cloudinary !== false;
    const bestOf = Math.min(Math.max(Number(body?.best_of) || 3, 1), 5);

    if (!prompt) throw new Error("prompt is required");

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
    const availableModels = await getAvailablePollinationsImageModels();
    const modelPool = buildModelPool(model, availableModels);
    const modelsTried = new Set<string>();

    const promptContext = extractPromptContext(body || {});
    const inferredComponents = inferDomainComponents(promptContext);
    const requestedComponents = dedupeStrings(promptContext.components, 10);
    const visualComponents = dedupeStrings([...requestedComponents, ...inferredComponents, ...promptContext.keywords.slice(0, 4)], 10);
    const contextLine = visualComponents.length ? `Use these visual components: ${visualComponents.join(", ")}.` : "";

    const groqPrompt = await rewritePromptWithGroq(prompt, GROQ_API_KEY, promptContext, visualComponents);
    const enhancedPrompt = compactPrompt(buildHighEnd3DPrompt(`${groqPrompt} ${contextLine}`));

    const candidates: string[] = [];
    let uploadedToCloudinary = false;
    const maxAttempts = Math.max(bestOf * 12, 24);

    for (let attempt = 0; attempt < maxAttempts && candidates.length < bestOf; attempt++) {
      const selectedModel = modelPool[attempt % modelPool.length] || model;
      modelsTried.add(selectedModel);
      const promptVariant = candidatePrompt(enhancedPrompt, attempt % 3);
      let candidate = buildPollinationsImageUrl(promptVariant, {
        width,
        height,
        model: selectedModel,
        nologo: true,
        seed: randomSeed(),
      });

      if (uploadToCdn && CLOUD_NAME && UPLOAD_PRESET) {
        try {
          candidate = await uploadImageToCloudinary(candidate, CLOUD_NAME, UPLOAD_PRESET);
          uploadedToCloudinary = true;
        } catch (e) {
          console.error("Cloudinary upload failed, using direct Pollinations URL:", e);
        }
      }

      const usable = await isUsableImage(candidate);
      if (!usable) continue;

      const containsText = await hasReadableText(candidate, GROQ_API_KEY);
      if (!containsText) {
        candidates.push(candidate);
      }
    }

    if (candidates.length === 0) {
      const safePrompt = [
        "Cinematic 3D concept image with one focal subject and abstract environment.",
        "Use premium lighting and realistic materials.",
        visualComponents.length ? `Include these visual components as objects only: ${visualComponents.slice(0, 6).join(", ")}.` : "",
        "Absolutely no readable text, labels, logos, numbers, captions, or watermarks.",
        "Avoid screens, signs, documents, posters, and UI panels.",
      ]
        .filter(Boolean)
        .join(" ");

      for (let attempt = 0; attempt < 24 && candidates.length < 1; attempt++) {
        const selectedModel = modelPool[attempt % modelPool.length] || model;
        modelsTried.add(selectedModel);
        let fallbackCandidate = buildPollinationsImageUrl(safePrompt, {
          width,
          height,
          model: selectedModel,
          nologo: true,
          seed: randomSeed(),
        });

        if (uploadToCdn && CLOUD_NAME && UPLOAD_PRESET) {
          try {
            fallbackCandidate = await uploadImageToCloudinary(fallbackCandidate, CLOUD_NAME, UPLOAD_PRESET);
            uploadedToCloudinary = true;
          } catch (e) {
            console.error("Cloudinary upload failed for fallback candidate:", e);
          }
        }

        const usable = await isUsableImage(fallbackCandidate);
        if (!usable) continue;
        const containsText = await hasReadableText(fallbackCandidate, GROQ_API_KEY);
        if (!containsText) {
          candidates.push(fallbackCandidate);
        }
      }
    }

    if (candidates.length === 0) {
      throw new Error("No clean text-free image candidate was produced. Please retry.");
    }

    const url = candidates[0];
    return new Response(
      JSON.stringify({
        success: true,
        url,
        candidates,
        uploaded_to_cloudinary: uploadedToCloudinary,
        prompt: enhancedPrompt,
        prompt_rewritten_by_groq: groqPrompt,
        visual_components_used: visualComponents,
        requested_model: model,
        model_pool_used: modelPool,
        models_tried: Array.from(modelsTried),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Generate image error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
