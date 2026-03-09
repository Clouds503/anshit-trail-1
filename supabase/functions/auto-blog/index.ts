import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { buildPollinationsImageUrl } from "../_shared/pollinations.ts";
import { uploadImageToCloudinary } from "../_shared/cloudinary.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BLOG_SYSTEM_PROMPT = `You are a principal-level technical content strategist, editorial director, and AI image prompt engineer for a premium IT education brand.
Produce authoritative, practical, and conversion-aware educational content for Indian learners.
Always prioritize factual accuracy, coherent structure, and real-world applicability.
Write in professional English only.
For image prompts, produce production-ready cinematic 3D briefs with precise scene direction, visual hierarchy, and context alignment.
Never output markdown fences or explanatory text outside the requested JSON.`;

type BlogDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  thumbnail_prompt: string;
  inline_image_prompts: string[];
  generation_source: "groq" | "fallback";
  generation_warning?: string;
};

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

function getBearerToken(req: Request): string {
  const raw = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function decodeJwtRole(token: string): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return typeof payload?.role === "string" ? payload.role : "";
  } catch {
    return "";
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `blog-${Date.now()}`;
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

function overlapRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const denominator = Math.min(setA.size, setB.size);
  return denominator ? intersection / denominator : 0;
}

function dedupeKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of input) {
    const value = `${raw || ""}`.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

// helper used by the main handler (and tests) to reconcile body values with
// queued row defaults.  exports make it easy to cover with unit tests.
export function hydrateTopicAndKeywords(
  originalTopic: string,
  originalKeywords: unknown,
  queueItem: any | null,
): { topic: string; keywords: string[] } {
  let topic = `${originalTopic || ""}`.trim();
  let keywords = dedupeKeywords(originalKeywords || []);
  if (queueItem) {
    if (!topic) {
      topic = `${queueItem.topic || ""}`.trim();
    }
    if ((keywords.length === 0 || !keywords) && Array.isArray(queueItem.keywords)) {
      keywords = dedupeKeywords(queueItem.keywords);
    }
  }
  return { topic, keywords };
}

function withDefaultKeywords(topic: string, input: string[]): string[] {
  const defaults = [
    topic,
    `${topic} roadmap`,
    `${topic} interview preparation`,
    "IT career growth India",
    "Clouds Trail",
  ];
  return dedupeKeywords([...(input || []), ...defaults]).slice(0, 12);
}

function buildFallbackBlogDraft(topic: string, keywords: string[]): BlogDraft {
  const finalKeywords = withDefaultKeywords(topic, keywords);
  const title = topic.trim().slice(0, 70) || "Career Roadmap for IT Learners";
  const excerpt = `Learn ${topic} with a practical roadmap, tools, projects, and interview strategy for Indian IT job seekers.`
    .slice(0, 160);
  const content = `## Introduction
${topic} is one of the highest-impact skills for learners who want to build a sustainable technology career. This guide provides a practical, execution-focused path to help you move from beginner level to interview-ready level with clear checkpoints.

[IMAGE:intro_context_visual]

## Why ${topic} Matters in 2026
Companies are hiring for professionals who can solve business problems with practical implementation, not just theoretical knowledge. In India, employers prioritize candidates who can show project depth, consistent learning, and role-specific problem-solving ability.

### Hiring Trends
- Increased demand for hybrid technical + communication skills
- Preference for project-backed portfolios
- Strong screening through assignments and scenario questions

## Core Skills You Must Build
### Technical Foundations
- Understand domain fundamentals and key concepts
- Build confidence with tools used in real projects
- Learn deployment, monitoring, and performance basics

### Applied Skills
- Problem decomposition and structured implementation
- Debugging and troubleshooting with evidence
- Documentation and communication for team collaboration

## 30-60-90 Day Learning Roadmap
### First 30 Days
- Build fundamentals and complete guided labs
- Maintain learning notes and quick revision sheets
- Create one mini project with basic use case coverage

### Days 31-60
- Build intermediate projects with edge cases
- Add testing and performance optimization
- Start interview question practice (daily)

### Days 61-90
- Build one production-style capstone project
- Prepare portfolio narratives and resume bullets
- Run mock interviews and improve weak areas

[IMAGE:roadmap_visual]

## Recommended Tooling Stack
| Objective | Recommended Focus |
|---|---|
| Learning speed | Structured modules + focused practice |
| Project development | Version control + modular architecture |
| Interview prep | Scenario questions + timed practice |
| Career readiness | Portfolio quality + communication |

## Common Mistakes and Fixes
| Mistake | Why It Hurts | Practical Fix |
|---|---|---|
| Only watching tutorials | No execution depth | Build while learning |
| Skipping projects | No proof of capability | Build 3 portfolio projects |
| No revision cycle | Concepts fade quickly | Weekly revision blocks |
| Ignoring interview prep | Last-minute panic | Start from week 3 |

## Execution Checklist
- Complete foundation modules
- Build at least 3 projects
- Add README, architecture notes, and results
- Practice 100+ interview questions
- Run at least 3 mock interviews

## Portfolio Checklist
- One beginner project
- One intermediate project
- One real-world capstone
- Quantified outcomes and key decisions
- Clean Git history and readable docs

## Interview Strategy
Focus on role-oriented preparation:
- Explain the problem before code/design decisions
- Mention tradeoffs and alternatives
- Share failures and improvements from your projects
- Keep answers concise, structured, and measurable

## Final Action Plan
If you follow this roadmap with disciplined execution, you can become interview-ready in a predictable timeline. Keep your effort visible through projects, documentation, and mock interview feedback.

For guided mentorship, placement-focused projects, and personalized career support, connect with Clouds Trail.
`;

  return {
    title,
    slug: toSlug(title),
    excerpt,
    content,
    category: "Technology Careers",
    seo_title: title.slice(0, 60),
    seo_description: excerpt.slice(0, 155),
    seo_keywords: finalKeywords,
    thumbnail_prompt: `Premium cinematic 3D scene about ${topic} with industry tools, modern workflow components, and mentorship context`,
    inline_image_prompts: [
      `3D visual explaining roadmap milestones for ${topic}`,
      `3D visual showing project-to-placement journey for ${topic}`,
    ],
    generation_source: "fallback",
  };
}

function normalizeDraft(raw: any, topic: string, keywords: string[]): BlogDraft {
  const fallback = buildFallbackBlogDraft(topic, keywords);
  const title = `${raw?.title || fallback.title}`.trim().slice(0, 70) || fallback.title;
  const excerpt = `${raw?.excerpt || fallback.excerpt}`.trim().slice(0, 160) || fallback.excerpt;
  const content = `${raw?.content || fallback.content}`.trim() || fallback.content;
  const category = `${raw?.category || fallback.category}`.trim().slice(0, 80) || fallback.category;
  const seoTitle = `${raw?.seo_title || title}`.trim().slice(0, 60) || title.slice(0, 60);
  const seoDescription = `${raw?.seo_description || excerpt}`.trim().slice(0, 155) || excerpt.slice(0, 155);

  return {
    title,
    slug: toSlug(`${raw?.slug || title}`),
    excerpt,
    content,
    category,
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: withDefaultKeywords(topic, dedupeKeywords(raw?.seo_keywords || keywords)),
    thumbnail_prompt: `${raw?.thumbnail_prompt || fallback.thumbnail_prompt}`.trim(),
    inline_image_prompts: Array.isArray(raw?.inline_image_prompts)
      ? raw.inline_image_prompts.map((v: unknown) => `${v || ""}`.trim()).filter(Boolean).slice(0, 4)
      : fallback.inline_image_prompts,
    generation_source: "groq",
  };
}

async function generateBlogDraft(topic: string, keywords: string[], cannibalizationGuard: string, groqApiKey: string): Promise<BlogDraft> {
  const fallback = buildFallbackBlogDraft(topic, keywords);
  if (!groqApiKey) {
    return { ...fallback, generation_warning: "GROQ_API_KEY not configured. Returned fallback draft." };
  }

  const prompt = `Create a premium SEO blog draft for Clouds Trail.

Topic: "${topic}"
Target keywords: ${keywords.length ? keywords.join(", ") : "infer relevant high-intent keywords"}
Existing topics to avoid overlap:
${cannibalizationGuard}

Requirements:
- Markdown content in English, 1400-1900 words
- Use clear heading hierarchy with ## and ###
- Include: intro, foundations, implementation framework, tools section, common mistakes, optimization tips, 30-60-90 plan, and CTA
- Include at least 2 checklists and 2 markdown tables
- Include 2-4 placeholders in format [IMAGE:section_visual_intent]

Return ONLY a valid JSON object with keys:
title, slug, excerpt, content, category, seo_title, seo_description, seo_keywords, thumbnail_prompt, inline_image_prompts`;

  const models = [
    { name: "llama-3.3-70b-versatile", maxTokens: 1700 },
    { name: "llama-3.1-8b-instant", maxTokens: 1300 },
  ];

  let lastWarning = "";

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.name,
          messages: [
            { role: "system", content: BLOG_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.45,
          max_tokens: model.maxTokens,
        }),
      });
      clearTimeout(timer);

      if (!groqRes.ok) {
        const errText = await groqRes.text().catch(() => "");
        lastWarning = `Groq API error (${model.name}): ${groqRes.status}`;
        if (groqRes.status === 429) {
          console.warn("auto-blog Groq rate limited:", errText.slice(0, 300));
          break;
        }
        console.warn("auto-blog Groq non-429 error:", errText);
        continue;
      }

      const groqData = await groqRes.json();
      const raw = groqData?.choices?.[0]?.message?.content || "";
      const parsed = parseAIJson(raw);
      return normalizeDraft(parsed, topic, keywords);
    } catch (err: any) {
      lastWarning = `Groq request failed (${model.name}): ${err?.message || "unknown error"}`;
      console.warn(lastWarning);
    }
  }

  return {
    ...fallback,
    generation_warning: lastWarning || "Groq unavailable. Returned fallback draft.",
  };
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

  for (let attempt = 0; attempt < 2; attempt++) {
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

async function requireAdminOrService(req: Request, supabase: any): Promise<{ caller: "admin" | "service" | "public"; userId: string }> {
  const token = getBearerToken(req);
  if (!token) return { caller: "public", userId: "public" };

  const role = decodeJwtRole(token);
  if (role === "service_role") {
    return { caller: "service", userId: "service_role" };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) return { caller: "public", userId: "public" };

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) return { caller: "public", userId: "public" };

  return { caller: "admin", userId: userData.user.id };
}

async function enforceRateLimit(
  supabase: any,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await supabase.rpc("enforce_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.warn("rate-limit rpc error:", error.message);
    return;
  }

  if (data === false) throw new HttpError(429, "Rate limit exceeded. Please try again later.");
}

async function ensureUniqueSlug(supabase: any, rawSlug: string): Promise<string> {
  const base = toSlug(rawSlug);
  for (let index = 0; index < 20; index++) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data, error } = await supabase.from("blogs").select("id").eq("slug", candidate).limit(1);
    if (error) throw new Error(`Slug uniqueness check failed: ${error.message}`);
    if (!data || data.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function checkCannibalization(
  supabase: any,
  topic: string,
  keywords: string[],
): Promise<{ blocked: boolean; reason?: string; existingTitles: string[] }> {
  const targetTopic = normalizeText(topic);
  const targetSlug = toSlug(topic);
  const topicTokens = tokenize(topic);
  const keywordTokens = tokenize(keywords.join(" "));

  const { data: blogs, error: blogsError } = await supabase
    .from("blogs")
    .select("id,title,slug,seo_keywords")
    .order("created_at", { ascending: false })
    .limit(250);
  if (blogsError) throw new Error(`Failed to check existing blogs: ${blogsError.message}`);

  const { data: queueItems, error: queueError } = await supabase
    .from("blog_queue")
    .select("id,topic,status")
    .in("status", ["pending", "generating", "generated", "review"])
    .order("created_at", { ascending: false })
    .limit(250);
  if (queueError) throw new Error(`Failed to check queue topics: ${queueError.message}`);

  const existingTitles: string[] = [];

  for (const blog of blogs || []) {
    const title = `${blog.title || ""}`.trim();
    if (title) existingTitles.push(title);

    const normalizedTitle = normalizeText(title);
    if (normalizedTitle && normalizedTitle === targetTopic) {
      return { blocked: true, reason: `Topic duplicates existing blog title: "${title}"`, existingTitles };
    }

    if (`${blog.slug || ""}`.trim() === targetSlug) {
      return { blocked: true, reason: `Topic duplicates existing blog slug: "${blog.slug}"`, existingTitles };
    }

    const titleTokens = tokenize(title);
    const topicSimilarity = jaccardSimilarity(topicTokens, titleTokens);
    const existingKeywordTokens = tokenize(Array.isArray(blog.seo_keywords) ? blog.seo_keywords.join(" ") : "");
    const keywordSimilarity = overlapRatio(keywordTokens, existingKeywordTokens);

    if (topicSimilarity >= 0.72 || (topicSimilarity >= 0.5 && keywordSimilarity >= 0.72)) {
      return {
        blocked: true,
        reason: `Topic is too close to existing published content: "${title}"`,
        existingTitles,
      };
    }
  }

  for (const item of queueItems || []) {
    const queueTopic = `${item.topic || ""}`.trim();
    if (!queueTopic) continue;
    if (normalizeText(queueTopic) === targetTopic) {
      return { blocked: true, reason: `Topic already exists in queue: "${queueTopic}"`, existingTitles };
    }
    const similarity = jaccardSimilarity(topicTokens, tokenize(queueTopic));
    if (similarity >= 0.78) {
      return { blocked: true, reason: `Topic is too close to queued topic: "${queueTopic}"`, existingTitles };
    }
  }

  return { blocked: false, existingTitles };
}

async function triggerSitemapAndIndexing(
  supabaseUrl: string,
  serviceRoleKey: string,
  blogRow: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/sitemap`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });
  } catch (err) {
    console.warn("sitemap refresh call failed:", err);
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/index-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ table: "blogs", ...blogRow }),
    });
    if (!res.ok) console.warn("index-content call failed:", await res.text());
  } catch (err) {
    console.warn("index-content call error:", err);
  }
}

async function generateViaGenerateImageFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`generate-image function failed: ${res.status} ${err}`);
  }

  const body = await res.json().catch(() => null);
  const url = body?.url?.toString?.() || "";
  if (!url) throw new Error("generate-image function returned empty url");
  return url;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let requestBody: any = {};
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const UPLOAD_PRESET = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    requestBody = await req.json();
    const queue_id = `${requestBody?.queue_id || ""}`.trim() || null;
    const publishNow = true;

    const supabase = createServiceClient();

    // if a queue item is referenced we need to pull extra data from it
    let queueItem: any = null;
    if (queue_id) {
      const { data, error } = await supabase
        .from("blog_queue")
        // grab topic+keywords so we can fall back when the caller omits them
        .select("id,topic,status,queue_type,source_blog_id,keywords")
        .eq("id", queue_id)
        .maybeSingle();
      if (error) throw new Error(`Failed to load queue item: ${error.message}`);
      if (!data) throw new HttpError(404, "Queue item not found");
      queueItem = data;
    }

    // hydrate valid topic/keywords from either the body or the queue record
    let topic: string;
    let keywords: string[];
    ({ topic, keywords } = hydrateTopicAndKeywords(
      `${requestBody?.topic || ""}`,
      requestBody?.keywords,
      queueItem,
    ));

    if (!topic) throw new HttpError(400, "Topic is required (provide a topic or a valid queue_id)");

    const identity = await requireAdminOrService(req, supabase);
    await enforceRateLimit(supabase, `auto-blog:${identity.caller}:${identity.userId}`, 12, 3600);

    const isRefreshQueue = queueItem?.queue_type === "refresh" && !!queueItem?.source_blog_id;

    if (queue_id) {
      await supabase.from("blog_queue").update({ status: "generating", error_message: null }).eq("id", queue_id);
    }

    let existingTitlesForPrompt: string[] = [];
    if (!isRefreshQueue) {
      const duplicationCheck = await checkCannibalization(supabase, topic, keywords);
      existingTitlesForPrompt = duplicationCheck.existingTitles;
      if (duplicationCheck.blocked) {
        if (queue_id) {
          await supabase
            .from("blog_queue")
            .update({ status: "failed", error_message: duplicationCheck.reason || "Duplicate topic blocked" })
            .eq("id", queue_id);
        }
        throw new HttpError(409, duplicationCheck.reason || "Topic is too close to existing content");
      }
    } else {
      const { data: latestTitles } = await supabase
        .from("blogs")
        .select("title")
        .order("created_at", { ascending: false })
        .limit(60);
      existingTitlesForPrompt = (latestTitles || []).map((item: any) => `${item.title || ""}`.trim()).filter(Boolean);
    }

    const cannibalizationGuard = existingTitlesForPrompt.slice(0, 20).join(" | ") || "None";

    const blogData = await generateBlogDraft(topic, keywords, cannibalizationGuard, GROQ_API_KEY || "");

    // Generate and upload thumbnail
    const thumbnailPrompt = buildHighEnd3DPrompt(
      blogData.thumbnail_prompt || `Premium 3D editorial cover image for blog about ${topic}`,
      `Blog title: ${blogData.title || topic}. Excerpt: ${blogData.excerpt || topic}`,
    );
    let thumbnailUrl = "";
    if (blogData.generation_source === "fallback") {
      thumbnailUrl = buildPollinationsImageUrl(thumbnailPrompt, {
        width: 1200,
        height: 630,
        model: "flux",
        nologo: true,
        seed: randomSeed(),
      });
    } else {
      try {
        thumbnailUrl = await generateViaGenerateImageFunction(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          prompt: thumbnailPrompt,
          width: 1200,
          height: 630,
          model: "flux",
          upload_to_cloudinary: true,
          best_of: 5,
          title: blogData.title || topic,
          short_description: blogData.excerpt || "",
          description: (blogData.content || "").slice(0, 900),
          category: blogData.category || "Blog",
          keywords: Array.isArray(blogData.seo_keywords) ? blogData.seo_keywords : (keywords || []),
          visual_components: [
            topic,
            blogData.category || "technology",
            "mentor and learners",
            "workflow components",
          ],
          section_title: "blog cover",
          audience: "Indian IT learners and job seekers",
        });
      } catch (edgeErr) {
        console.error("generate-image function failed for thumbnail, using local fallback:", edgeErr);
        thumbnailUrl = await generateManagedImage(thumbnailPrompt, 1200, 630, CLOUD_NAME, UPLOAD_PRESET);
      }
    }

    // Generate and upload inline images
    let content = `${blogData.content || ""}`;
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
      const maxInlineImages = blogData.generation_source === "groq" ? 2 : 0;
      const promptsToUse = inlineImagePrompts.slice(0, maxInlineImages);
      const placeholders = [...content.matchAll(/\[IMAGE:[^\]]*\]/g)].map((m) => m[0]);

      for (let i = 0; i < promptsToUse.length; i++) {
        const imgPrompt = buildHighEnd3DPrompt(
          promptsToUse[i],
          `Blog topic: ${topic}. Section intent: ${promptsToUse[i]}`,
        );
        let imgUrl = "";
        try {
          imgUrl = await generateViaGenerateImageFunction(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            prompt: imgPrompt,
            width: 800,
            height: 450,
            model: "flux",
            upload_to_cloudinary: true,
            best_of: 3,
            title: blogData.title || topic,
            short_description: blogData.excerpt || "",
            description: promptsToUse[i],
            category: blogData.category || "Blog",
            keywords: Array.isArray(blogData.seo_keywords) ? blogData.seo_keywords : (keywords || []),
            visual_components: [
              promptsToUse[i],
              "domain-specific workflow components",
              "abstract technical objects",
            ],
            section_title: promptsToUse[i],
            audience: "Indian IT learners and professionals",
          });
        } catch (edgeErr) {
          console.error("generate-image function failed for inline image, using local fallback:", edgeErr);
          imgUrl = await generateManagedImage(imgPrompt, 800, 450, CLOUD_NAME, UPLOAD_PRESET);
        }

        if (placeholders[i]) {
          const altText = `${blogData.title || topic} visual ${i + 1}`;
          content = content.replace(placeholders[i], `![${altText}](${imgUrl})`);
        } else {
          if (i >= 2) continue;
          const headings = [...content.matchAll(/^##\s.+$/gm)];
          if (headings[i + 1]) {
            const idx = content.indexOf(headings[i + 1][0]);
            const altText = `${blogData.title || topic} section visual ${i + 1}`;
            content = content.slice(0, idx) + `\n![${altText}](${imgUrl})\n\n` + content.slice(idx);
          }
        }
      }
    }

    // Clean any unresolved placeholders if prompts were fewer than placeholders.
    content = content.replace(/\[IMAGE:[^\]]*\]/g, "");

    const canonicalTitle = `${blogData.title || topic}`.trim().slice(0, 140);
    let slugSeed = `${blogData.slug || canonicalTitle || topic}`.trim();
    if (isRefreshQueue) {
      slugSeed = `${slugSeed}-refresh-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    }
    const finalSlug = await ensureUniqueSlug(supabase, slugSeed);
    const finalSeoKeywords = dedupeKeywords(blogData.seo_keywords || keywords).slice(0, 12);

    const { data: savedBlog, error: dbError } = await supabase.from("blogs").insert({
      title: canonicalTitle,
      slug: finalSlug,
      content,
      excerpt: `${blogData.excerpt || ""}`.trim().slice(0, 220),
      image_url: thumbnailUrl,
      category: `${blogData.category || "Technology"}`.trim().slice(0, 80),
      author: "Clouds Trail",
      is_published: publishNow,
      is_auto_generated: true,
      seo_title: `${blogData.seo_title || canonicalTitle}`.trim().slice(0, 80),
      seo_description: `${blogData.seo_description || blogData.excerpt || ""}`.trim().slice(0, 200),
      seo_keywords: finalSeoKeywords,
    }).select().single();

    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    if (queue_id && savedBlog) {
      await supabase
        .from("blog_queue")
        .update({ status: "generated", blog_id: savedBlog.id, error_message: null })
        .eq("id", queue_id);

      await supabase
        .from("blog_queue")
        .update({ status: publishNow ? "published" : "review" })
        .eq("id", queue_id);
    }

    if (savedBlog && publishNow) {
      await triggerSitemapAndIndexing(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, savedBlog);
    }

    return new Response(JSON.stringify({
      ...savedBlog,
      generation_source: blogData.generation_source,
      generation_warning: blogData.generation_warning || null,
      workflow_status: publishNow ? "published" : "review",
      message: publishNow ? "Blog generated and published." : "Blog draft generated and moved to review.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Auto-blog error:", e);

    try {
      if (requestBody?.queue_id) {
        const supabase = createServiceClient();
        await supabase
          .from("blog_queue")
          .update({ status: "failed", error_message: e.message })
          .eq("id", requestBody.queue_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
