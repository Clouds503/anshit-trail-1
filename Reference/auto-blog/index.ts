import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { buildPollinationsImageUrl } from "../_shared/pollinations.ts";
import { uploadImageToCloudinary } from "../_shared/cloudinary.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOG_SYSTEM_PROMPT = `You are a principal-level technical content strategist, editorial director, and AI image prompt engineer for a premium IT education brand.
Produce authoritative, practical, and conversion-aware educational content for Indian learners.
Always prioritize factual accuracy, coherent structure, and real-world applicability.
Write in professional English only.
For image prompts, produce production-ready cinematic 3D briefs with precise scene direction, visual hierarchy, and context alignment.
Never output markdown fences or explanatory text outside the requested JSON.`;

function buildHighEnd3DPrompt(basePrompt: string, context: string): string {
  return [
    "MASTER 3D VISUAL BRIEF.",
    basePrompt,
    `Context: ${context}.`,
    "Style: premium cinematic 3D with physically based rendering, accurate domain objects, layered foreground-midground-background depth, volumetric lighting, realistic materials, and controlled reflections.",
    "Composition: clear focal subject, clean visual hierarchy, editorial framing, high dynamic range, anti-aliased edges, polished premium finish.",
    "Do not render words, letters, typography, banners, posters, or UI text.",
    "If text appears despite constraints, it must be clean English only and fully legible.",
    "Strictly forbid non-English scripts, non-Latin characters, random glyphs, logos, brand marks, and watermarks.",
  ].join(" ");
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
): Promise<string> {
  let fallbackUrl = "";

  for (let attempt = 0; attempt < 4; attempt++) {
    const generatedUrl = buildPollinationsImageUrl(prompt, {
      width,
      height,
      model: "flux",
      nologo: true,
      seed: randomSeed(),
    });
    fallbackUrl = generatedUrl;

    if (cloudName && uploadPreset) {
      try {
        const uploaded = await uploadImageToCloudinary(generatedUrl, cloudName, uploadPreset);
        if (await isUsableImage(uploaded)) return uploaded;
        fallbackUrl = uploaded || generatedUrl;
      } catch {
        // Continue with direct URL checks.
      }
    }

    if (await isUsableImage(generatedUrl)) return generatedUrl;
  }

  return fallbackUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";

    const { topic, keywords, queue_id } = await req.json();
    if (!topic) throw new Error("Topic is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (queue_id) {
      await supabase.from("blog_queue").update({ status: "generating" }).eq("id", queue_id);
    }

    const prompt = `Create a master-level, SEO-driven long-form blog article for Clouds Trail.

Topic: "${topic}"
${keywords?.length ? `Target keywords: ${keywords.join(", ")}` : "Target keywords: infer high-intent relevant keywords."}

Audience:
- Indian IT learners, job seekers, and career switchers (beginner to intermediate).

Primary objective:
- Deliver expert educational value while naturally driving inquiry intent.

Hard requirements for "content":
- Markdown format, 2200-2800 words, English only.
- Strong heading hierarchy using ## and ###.
- Include: concise intro, foundations, step-by-step implementation framework, tools/stack section, practical use-cases, common mistakes, optimization tips, 30-60-90 day action roadmap, and final CTA.
- Add at least 2 checklists and 2 comparison/decision tables.
- Include 4-6 placeholders exactly in format [IMAGE:section_visual_intent], distributed between major sections.
- No fluff, no unverifiable claims, no fake statistics.

Return a single JSON object with EXACT keys:
{
  "title": "string <= 70 chars",
  "slug": "url-friendly-lowercase-string",
  "excerpt": "string <= 160 chars",
  "content": "markdown string",
  "category": "single category string",
  "seo_title": "string <= 60 chars",
  "seo_description": "string <= 155 chars",
  "seo_keywords": ["8-12 keyword strings"],
  "thumbnail_prompt": "single advanced 3D image prompt for cover",
  "inline_image_prompts": ["4-6 advanced 3D prompts mapped to article sections"]
}

Image prompt requirements (thumbnail + inline):
- Must be highly specific and context-accurate to the title/section.
- Must describe subject, scene composition, camera perspective, lighting, depth cues, and material detail for premium cinematic 3D rendering.
- No text overlays preferred; if unavoidable, enforce English-only legible text.
- Forbid non-English scripts, random glyphs, logos, and watermarks.

Output format rules:
- Return ONLY valid JSON object.
- No markdown fences.
- No extra commentary before or after JSON.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: BLOG_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
        max_tokens: 5200,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error: ${groqRes.status} ${errText}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices[0].message.content;

    let blogData;
    try {
      blogData = parseAIJson(rawContent);
    } catch (parseErr) {
      console.error("Raw AI content:", rawContent?.substring(0, 500));
      console.error("Parse error:", parseErr);
      throw new Error("Failed to parse AI response");
    }

    // Generate and upload thumbnail
    const thumbnailPrompt = buildHighEnd3DPrompt(
      blogData.thumbnail_prompt || `Premium 3D editorial cover image for blog about ${topic}`,
      `Blog title: ${blogData.title || topic}. Excerpt: ${blogData.excerpt || topic}`,
    );
    const thumbnailUrl = await generateManagedImage(thumbnailPrompt, 1200, 630, CLOUD_NAME, UPLOAD_PRESET);

    // Generate and upload inline images
    let content = blogData.content || "";
    const headingFallbackPrompts = [...content.matchAll(/^##\s+(.+)$/gm)]
      .slice(0, 3)
      .map((m) => `High-end 3D editorial visual for section "${m[1]}" in blog topic "${topic}"`);
    const inlineImagePrompts = Array.isArray(blogData.inline_image_prompts) && blogData.inline_image_prompts.length
      ? blogData.inline_image_prompts
      : headingFallbackPrompts.length
        ? headingFallbackPrompts
        : [
            `Professional concept image for ${topic}`,
            `Modern visual explaining key process in ${topic}`,
          ];

    if (inlineImagePrompts.length) {
      const maxInlineImages = 4;
      const promptsToUse = inlineImagePrompts.slice(0, maxInlineImages);
      const placeholders = [...content.matchAll(/\[IMAGE:[^\]]*\]/g)].map((m) => m[0]);

      for (let i = 0; i < promptsToUse.length; i++) {
        const imgPrompt = buildHighEnd3DPrompt(
          promptsToUse[i],
          `Blog topic: ${topic}. Section intent: ${promptsToUse[i]}`,
        );
        const imgUrl = await generateManagedImage(imgPrompt, 800, 450, CLOUD_NAME, UPLOAD_PRESET);

        if (placeholders[i]) {
          content = content.replace(placeholders[i], `![${imgPrompt}](${imgUrl})`);
        } else {
          if (i >= 2) continue;
          const headings = [...content.matchAll(/^##\s.+$/gm)];
          if (headings[i + 1]) {
            const idx = content.indexOf(headings[i + 1][0]);
            content = content.slice(0, idx) + `\n![${imgPrompt}](${imgUrl})\n\n` + content.slice(idx);
          }
        }
      }
    }

    // Clean any unresolved placeholders if prompts were fewer than placeholders.
    content = content.replace(/\[IMAGE:[^\]]*\]/g, "");

    const { data: savedBlog, error: dbError } = await supabase.from("blogs").insert({
      title: blogData.title,
      slug: blogData.slug || blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      content,
      excerpt: blogData.excerpt,
      image_url: thumbnailUrl,
      category: blogData.category,
      author: "AI (Groq)",
      is_published: true,
      is_auto_generated: true,
      seo_title: blogData.seo_title,
      seo_description: blogData.seo_description,
      seo_keywords: blogData.seo_keywords || [],
    }).select().single();

    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    if (queue_id && savedBlog) {
      await supabase.from("blog_queue").update({ status: "published", blog_id: savedBlog.id }).eq("id", queue_id);
    }

    // attempt auto-indexing using new serverless function
    if (savedBlog) {
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/index-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
          },
          body: JSON.stringify(savedBlog),
        });
        if (!res.ok) console.warn("auto-index call failed", await res.text());
      } catch (e) {
        console.error("auto-index error in auto-blog", e);
      }
    }

    return new Response(JSON.stringify(savedBlog), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Auto-blog error:", e);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.queue_id) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("blog_queue").update({ status: "failed", error_message: e.message }).eq("id", body.queue_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
