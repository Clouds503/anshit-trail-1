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

function buildHighEnd3DPrompt(prompt: string): string {
  return [
    prompt,
    "Create a premium cinematic 3D visual with realistic materials, layered depth, and polished lighting.",
    "Use one clear focal subject and clean composition.",
    "The image must contain zero readable text: no words, no letters, no numbers, no logos, no watermarks, no captions, no UI text.",
    "Avoid signs, banners, posters, and readable screen content.",
  ].join(" ");
}

function compactPrompt(value: string, maxLength = 700): string {
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
  if (!groqApiKey) return true;

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

  try {
    const scout = await detectWithModel("meta-llama/llama-4-scout-17b-16e-instruct");
    if (scout) return true;
    const maverick = await detectWithModel("meta-llama/llama-4-maverick-17b-128e-instruct");
    return maverick;
  } catch {
    // Fail safe: if text detection is unavailable, reject candidate.
    return true;
  }
}

function candidatePrompt(basePrompt: string, attempt: number): string {
  if (attempt === 0) return `${basePrompt} Avoid screens and UI panels.`;
  if (attempt === 1) return `${basePrompt} No text anywhere. No letters. No numbers. No symbols.`;
  return `${basePrompt} Avoid monitors, dashboards, documents, posters, labels, and any readable symbols. Use abstract props only.`;
}

async function rewritePromptWithGroq(userPrompt: string, groqApiKey: string): Promise<string> {
  if (!groqApiKey) return userPrompt;

  const rewritePrompt = `Rewrite the following request into one advanced cinematic 3D image generation prompt.

User request:
${userPrompt}

Requirements:
- Keep meaning accurate.
- English only.
- No text overlays or typography in final image.
- Mention realistic materials, lighting, depth, and composition.
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

    const groqPrompt = await rewritePromptWithGroq(prompt, GROQ_API_KEY);
    const enhancedPrompt = compactPrompt(buildHighEnd3DPrompt(groqPrompt));

    const candidates: string[] = [];
    let uploadedToCloudinary = false;
    const maxAttempts = Math.max(bestOf * 6, 12);

    for (let attempt = 0; attempt < maxAttempts && candidates.length < bestOf; attempt++) {
      const promptVariant = candidatePrompt(enhancedPrompt, attempt % 3);
      let candidate = buildPollinationsImageUrl(promptVariant, {
        width,
        height,
        model,
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
        "Absolutely no readable text, labels, logos, numbers, captions, or watermarks.",
        "Avoid screens, signs, documents, posters, and UI panels.",
      ].join(" ");

      for (let attempt = 0; attempt < 12 && candidates.length < 1; attempt++) {
        let fallbackCandidate = buildPollinationsImageUrl(safePrompt, {
          width,
          height,
          model,
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
        if (!containsText) candidates.push(fallbackCandidate);
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
