import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { buildPollinationsImageUrl } from "../_shared/pollinations.ts";
import { uploadImageToCloudinary } from "../_shared/cloudinary.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROGRAM_SYSTEM_PROMPT = `You are a principal instructional copywriter and visual prompt architect for premium IT course marketing.
Create content that is technically credible, outcome-focused, concise, and persuasive.
Write in professional English only.
For image prompts, generate master-grade cinematic 3D direction with precise subject accuracy and premium composition.
Return strictly valid JSON only, with no markdown fences or extra text.`;

const CLEAN_PROGRAM_FALLBACK_IMAGE_URL =
  "https://res.cloudinary.com/djvf4rg72/image/upload/v1772169180/cqpdvcsiwlcboxg7wcda.jpg";

function buildHighEnd3DPrompt(basePrompt: string, context: string): string {
  return [
    basePrompt,
    `Program context: ${context}.`,
    "Create a premium cinematic 3D training visual with realistic materials, depth layering, and clean visual hierarchy.",
    "Image accuracy must match program title and description.",
    "Absolutely no readable text: no words, no letters, no numbers, no logos, no watermarks, no UI text.",
    "Avoid screens, dashboards, documents, posters, and labels that can produce text artifacts.",
  ].join(" ");
}

function getNonBrandedVisualTopic(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("salesforce")) return "cloud CRM development workflows";
  if (t.includes("devops")) return "cloud automation and deployment workflows";
  if (t.includes("data science")) return "data science and machine learning workflows";
  if (t.includes("data analytics")) return "data analytics and business intelligence workflows";
  if (t.includes("cyber")) return "cybersecurity operations and threat defense workflows";
  if (t.includes("cloud")) return "cloud infrastructure and architecture workflows";
  if (t.includes("full stack")) return "modern web application development workflows";
  if (t.includes("blockchain")) return "distributed systems and blockchain workflows";
  return "professional IT training workflows";
}

async function generateViaGenerateImageFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  prompt: string,
  width: number,
  height: number,
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      width,
      height,
      upload_to_cloudinary: true,
      best_of: 5,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`generate-image function failed: ${res.status} ${err}`);
  }

  const body = await res.json().catch(() => null);
  const url = body?.url?.toString?.() || "";
  if (!url) throw new Error("generate-image function returned empty url");
  return url;
}

function randomSeed() {
  return Math.floor(Math.random() * 1000000000);
}

async function isUsableImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("image")) return false;
    const bytes = await res.arrayBuffer();
    return bytes.byteLength > 8_000;
  } catch {
    return false;
  }
}

async function generateManagedImage(
  prompt: string,
  width: number,
  height: number,
  cloudName: string,
  uploadPreset: string,
  groqApiKey: string,
  title: string,
): Promise<string> {
  const visualTopic = getNonBrandedVisualTopic(title);

  const detectTextWithModel = async (url: string, model: string): Promise<boolean> => {
    const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                text: "Return ONLY JSON object {\"has_text\": true|false}. has_text=true if any readable or prominent text-like artifact appears (words, letters, numbers, logos, labels, captions, watermark, UI text, or gibberish text).",
              },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
    });

    if (!visionRes.ok) throw new Error(`vision model failed: ${model}`);
    const visionData = await visionRes.json().catch(() => null);
    const parsed = parseAIJson(visionData?.choices?.[0]?.message?.content || "{}");
    return parsed?.has_text === true;
  };

  const hasReadableText = async (url: string): Promise<boolean> => {
    if (!groqApiKey) return true;
    try {
      const scout = await detectTextWithModel(url, "meta-llama/llama-4-scout-17b-16e-instruct");
      if (scout) return true;
      const maverick = await detectTextWithModel(url, "meta-llama/llama-4-maverick-17b-128e-instruct");
      return maverick;
    } catch {
      // Fail safe: if detector fails, reject candidate.
      return true;
    }
  };

  const safePromptBase = [
    `Cinematic 3D concept image representing ${visualTopic}.`,
    "Show learners and mentor in a premium training workspace with abstract technology props.",
    "No brand logos, no branded UI, no product logos.",
    "No monitors, no dashboards, no signs, no documents, and no labels.",
    "No text anywhere in the image.",
  ].join(" ");

  const promptVariant = (attempt: number) => {
    if (attempt === 0) return `${safePromptBase} Realistic materials, depth layering, polished lighting.`;
    if (attempt === 1) return `${safePromptBase} No text anywhere. No words. No letters. No numbers.`;
    if (attempt === 2) return `${safePromptBase} Avoid monitors, dashboards, UI panels, documents, posters, and signage.`;
    if (attempt === 3) return `${safePromptBase} Portrait composition, blurred background, one focal subject, clean frame.`;
    if (attempt % 2 === 0) return `${safePromptBase} Team collaboration scene, no screens visible, studio quality render.`;
    return `${safePromptBase} Mentor and learner interaction with abstract cloud props, no signage, no labels.`;
  };

  for (let attempt = 0; attempt < 20; attempt++) {
    const generatedUrl = buildPollinationsImageUrl(promptVariant(attempt), {
      width,
      height,
      model: "flux",
      nologo: true,
      seed: randomSeed(),
    });

    if (cloudName && uploadPreset) {
      try {
        const uploaded = await uploadImageToCloudinary(generatedUrl, cloudName, uploadPreset);
        if ((await isUsableImage(uploaded)) && !(await hasReadableText(uploaded))) return uploaded;
      } catch {
        // Continue with direct URL fallback.
      }
    }

    if ((await isUsableImage(generatedUrl)) && !(await hasReadableText(generatedUrl))) return generatedUrl;
  }

  throw new Error("Unable to produce a clean text-free program image. Retry generation.");
}

async function repairProgramJsonWithGroq(apiKey: string, malformed: string) {
  const repairPrompt = `Fix the following content into one strict JSON object.

Required keys:
{
  "short_description": "string <= 100 chars",
  "description": "string",
  "highlights": ["string"],
  "image_prompt": "string"
}

Rules:
- English only.
- highlights must contain 6 to 10 concise strings.
- Output valid JSON only.
- No markdown fences.

Input to repair:
${malformed}`;

  const repairRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You repair malformed AI output into strict valid JSON. Return JSON only.",
        },
        { role: "user", content: repairPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1400,
    }),
  });

  if (!repairRes.ok) throw new Error(`Groq repair error: ${repairRes.status}`);

  const repairData = await repairRes.json();
  const repairedText = repairData?.choices?.[0]?.message?.content || "";
  return parseAIJson(repairedText);
}

function buildFallbackProgramData(title: string, descriptionSeed?: string) {
  const seed = (descriptionSeed || "").trim();
  const shortBase = `${title} training for practical, job-ready skills`;

  return {
    short_description: shortBase.slice(0, 100),
    description:
      seed.length > 50
        ? seed
        : `${title} is designed to help learners build practical skills through structured modules, guided projects, and real-world use cases. The curriculum focuses on hands-on implementation, industry workflows, and interview-ready preparation so students can apply concepts confidently in live environments and accelerate career outcomes.`,
    highlights: [
      "Hands-on practical training",
      "Industry-aligned curriculum",
      "Real-world project implementation",
      "Career and interview preparation",
      "Mentor-led guided learning",
      "Job-ready skill development",
      "Best-practice architecture coverage",
      "Portfolio and deployment exposure",
    ],
    image_prompt: `Premium cinematic 3D training visual for ${title}, realistic tools and environment, no text overlays`,
  };
}

function normalizeProgramData(data: any, title: string, descriptionSeed?: string) {
  const fallback = buildFallbackProgramData(title, descriptionSeed);
  const safeShort = typeof data?.short_description === "string" && data.short_description.trim()
    ? data.short_description.trim().slice(0, 100)
    : fallback.short_description;

  const safeDesc = typeof data?.description === "string" && data.description.trim()
    ? data.description.trim()
    : fallback.description;

  const safeHighlights = Array.isArray(data?.highlights)
    ? data.highlights.map((h: unknown) => `${h || ""}`.trim()).filter(Boolean).slice(0, 10)
    : [];

  const finalHighlights = safeHighlights.length >= 4 ? safeHighlights : fallback.highlights;

  const safePrompt = typeof data?.image_prompt === "string" && data.image_prompt.trim()
    ? data.image_prompt.trim()
    : fallback.image_prompt;

  return {
    short_description: safeShort,
    description: safeDesc,
    highlights: finalHighlights,
    image_prompt: safePrompt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const { program_id, title, description_seed } = await req.json();
    if (!program_id || !title) throw new Error("program_id and title required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const prompt = `Generate master-level program content for an IT training course.

Course title: "${title}"
${description_seed ? `Existing context to incorporate: ${description_seed}` : "No existing context provided; infer from best industry standards."}

Business goal:
- Position this course as premium, practical, and career-relevant for Indian learners and job seekers.

Return a single JSON object with EXACT keys:
{
  "short_description": "string <= 100 chars, benefit-first",
  "description": "220-320 words, 2-3 crisp paragraphs, English only",
  "highlights": ["8 concise outcome-focused bullet strings"],
  "image_prompt": "single master-grade 3D image prompt"
}

Content requirements:
- Clearly cover who the course is for, what learners build, what tools/skills are covered, and career outcomes.
- Maintain technical credibility and concrete value; avoid generic filler.
- Tone: expert, clear, confident, no hype.

Image prompt requirements:
- Highly specific and accurate to course title + description.
- Must include subject, composition, camera perspective, lighting, depth, and material cues for premium cinematic 3D.
- Prefer no text overlays; if text appears, English only and legible.
- Forbid non-English scripts, random glyphs, logos, and watermarks.

Output rules:
- Return ONLY valid JSON object.
- No markdown fences.
- No extra text.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: PROGRAM_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
        max_tokens: 2000,
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq error: ${groqRes.status}`);
    const groqData = await groqRes.json();

    let contentData;
    try {
      contentData = parseAIJson(groqData.choices[0].message.content);
    } catch (parseErr) {
      console.error("Primary parse error:", parseErr);
      try {
        contentData = await repairProgramJsonWithGroq(GROQ_API_KEY, groqData.choices[0].message.content || "");
      } catch (repairErr) {
        console.error("Repair parse error:", repairErr);
        contentData = buildFallbackProgramData(title, description_seed);
      }
    }

    contentData = normalizeProgramData(contentData, title, description_seed);

    // Generate and upload image to Cloudinary
    const imgPrompt = buildHighEnd3DPrompt(
      contentData.image_prompt || `Modern 3D training program card for ${title}. ${contentData.short_description || ""}`,
      `Program: ${title}. Description: ${contentData.description || description_seed || ""}`,
    );
    const visualTopic = getNonBrandedVisualTopic(title);
    const edgePrompt = [
      `Cinematic 3D training card visual representing ${visualTopic}.`,
      "Show mentor and learners with abstract technology props in a premium workspace.",
      "No monitors, no dashboards, no signage, no labels, no logos.",
      "No readable text anywhere.",
    ].join(" ");

    let imageUrl = CLEAN_PROGRAM_FALLBACK_IMAGE_URL;
    try {
      imageUrl = await generateViaGenerateImageFunction(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        edgePrompt,
        800,
        450,
      );
    } catch (edgeErr) {
      console.error("generate-image function fallback failed:", edgeErr);
      try {
        imageUrl = await generateManagedImage(imgPrompt, 800, 450, CLOUD_NAME, UPLOAD_PRESET, GROQ_API_KEY, title);
      } catch (strictErr) {
        console.error("strict local image generation failed, using clean fallback:", strictErr);
        imageUrl = CLEAN_PROGRAM_FALLBACK_IMAGE_URL;
      }
    }

    const { error } = await supabase.from("programs").update({
      short_description: contentData.short_description,
      description: contentData.description,
      highlights: contentData.highlights || [],
      image_url: imageUrl,
    }).eq("id", program_id);

    if (error) throw new Error(`DB error: ${error.message}`);

    return new Response(JSON.stringify({ success: true, ...contentData, image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate program content error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
