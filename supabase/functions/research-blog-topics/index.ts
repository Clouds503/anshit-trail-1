import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TopicSuggestion = {
  topic: string;
  keywords: string[];
  priority: "high" | "medium" | "low";
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

async function requireAdminOrService(req: Request, supabase: any): Promise<{ caller: "admin" | "service" | "public"; userId: string }> {
  const token = getBearerToken(req);
  if (!token) return { caller: "public", userId: "public" };

  const role = decodeJwtRole(token);
  if (role === "service_role") return { caller: "service", userId: "service_role" };

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) return { caller: "public", userId: "public" };

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleError || !isAdmin) return { caller: "public", userId: "public" };

  return { caller: "admin", userId: userData.user.id };
}

async function enforceRateLimit(supabase: any, key: string, limit: number, windowSeconds: number): Promise<void> {
  const { data, error } = await supabase.rpc("enforce_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.warn("rate-limit rpc error:", error.message);
    return;
  }
  if (data === false) throw new HttpError(429, "Rate limit exceeded. Try again later.");
}

function normalizeText(value: string): string {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordsFromTopic(topic: string): string[] {
  const base = normalizeText(topic)
    .split(" ")
    .filter((word) => word.length > 2);
  const unique: string[] = [];
  for (const word of base) {
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique.length ? unique : ["it training", "tech careers", "clouds trail"];
}

function priorityFromIndex(index: number): "high" | "medium" | "low" {
  if (index < 3) return "high";
  if (index < 7) return "medium";
  return "low";
}

function buildFallbackTopics(numTopics: number, programTitles: string[], existingTopics: string[]): TopicSuggestion[] {
  const templates = [
    "Roadmap to become a %PROGRAM% professional in 2026",
    "%PROGRAM% interview questions and answers for freshers",
    "Top %PROGRAM% projects to build a job-ready portfolio",
    "%PROGRAM% salary trends in India: 2026 guide",
    "Common %PROGRAM% mistakes beginners should avoid",
    "%PROGRAM% certification path for working professionals",
    "How to switch to %PROGRAM% from non-IT background",
    "%PROGRAM% vs alternatives: which career path is better?",
    "AI tools every %PROGRAM% learner should use in 2026",
    "90-day %PROGRAM% study plan for placement preparation",
  ];

  const genericFallbacks = [
    "Top IT skills to learn for high-paying jobs in India in 2026",
    "How to build a tech portfolio that gets interview calls",
    "Cloud and cybersecurity job trends in India for 2026",
    "Beginner to job-ready: a practical IT upskilling framework",
    "How to prepare for technical interviews in 60 days",
    "Best project ideas to stand out in IT placement drives",
    "How to choose the right IT course for your career goals",
  ];

  const existingSet = new Set(existingTopics.map((topic) => normalizeText(topic)));
  const candidates: string[] = [];
  const programs = programTitles.length ? programTitles : ["Cloud Computing", "Data Science", "Cyber Security"];

  for (const program of programs) {
    for (const template of templates) {
      const title = template.replace(/%PROGRAM%/g, program);
      const normalized = normalizeText(title);
      if (!normalized || existingSet.has(normalized)) continue;
      existingSet.add(normalized);
      candidates.push(title);
      if (candidates.length >= numTopics * 2) break;
    }
    if (candidates.length >= numTopics * 2) break;
  }

  for (const title of genericFallbacks) {
    if (candidates.length >= numTopics * 2) break;
    const normalized = normalizeText(title);
    if (!normalized || existingSet.has(normalized)) continue;
    existingSet.add(normalized);
    candidates.push(title);
  }

  return candidates.slice(0, numTopics).map((topic, index) => ({
    topic,
    keywords: keywordsFromTopic(topic),
    priority: priorityFromIndex(index),
  }));
}

function normalizeTopics(raw: unknown, numTopics: number, fallback: TopicSuggestion[]): TopicSuggestion[] {
  if (!Array.isArray(raw)) return fallback;

  const seen = new Set<string>();
  const normalized: TopicSuggestion[] = [];

  for (const item of raw) {
    const topic = `${(item as any)?.topic || ""}`.trim();
    if (!topic) continue;
    const key = normalizeText(topic);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const rawKeywords = Array.isArray((item as any)?.keywords) ? (item as any).keywords : [];
    const keywords = rawKeywords
      .map((k: unknown) => `${k || ""}`.trim())
      .filter((k: string) => k.length > 0)
      .slice(0, 5);

    const priorityRaw = `${(item as any)?.priority || ""}`.toLowerCase();
    const priority = priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low"
      ? priorityRaw
      : priorityFromIndex(normalized.length);

    normalized.push({
      topic,
      keywords: keywords.length ? keywords : keywordsFromTopic(topic),
      priority,
    });

    if (normalized.length >= numTopics) break;
  }

  if (normalized.length >= numTopics) return normalized.slice(0, numTopics);

  const fallbackByKey = new Set(normalized.map((item) => normalizeText(item.topic)));
  for (const item of fallback) {
    if (normalized.length >= numTopics) break;
    const key = normalizeText(item.topic);
    if (!key || fallbackByKey.has(key)) continue;
    fallbackByKey.add(key);
    normalized.push(item);
  }

  return normalized.slice(0, numTopics);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";

    const { count } = await req.json().catch(() => ({ count: 5 }));
    const numTopics = Math.min(Math.max(count || 5, 1), 20);

    const supabase = createServiceClient();
    const identity = await requireAdminOrService(req, supabase);
    await enforceRateLimit(supabase, `research-blog-topics:${identity.caller}:${identity.userId}`, 30, 3600);

    const { data: existingBlogs } = await supabase.from("blogs").select("title").limit(50);
    const { data: queueItems } = await supabase.from("blog_queue").select("topic").limit(50);
    const existingTopics = [
      ...(existingBlogs || []).map((b: any) => b.title),
      ...(queueItems || []).map((q: any) => q.topic),
    ];

    const { data: programs } = await supabase.from("programs").select("title").eq("is_active", true);
    const programTitles = (programs || []).map((p: any) => p.title);
    const fallbackTopics = buildFallbackTopics(numTopics, programTitles, existingTopics);

    const prompt = `You are an SEO content strategist for "Clouds Trail", an IT training institute in India.
Generate ${numTopics} unique, trending blog topic ideas that would drive organic traffic.

Programs offered: ${programTitles.join(", ")}

Already covered topics (avoid duplicates): ${existingTopics.slice(0, 20).join(", ")}

Requirements:
- Topics should be highly searchable and trending in 2026
- Mix of educational, career guidance, and technology trends
- Include long-tail keyword-rich titles
- Target Indian IT job seekers and tech enthusiasts

Return a JSON array of objects with:
- topic: the blog title/topic
- keywords: array of 3-5 target keywords
- priority: "high", "medium", or "low" based on search potential

Return ONLY valid JSON array, no markdown.`;

    let source: "groq" | "fallback" = "fallback";
    let warning = "";
    let topics: TopicSuggestion[] = fallbackTopics;

    if (GROQ_API_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1800,
          }),
        });
        clearTimeout(timeout);

        if (!groqRes.ok) {
          warning = `Groq error: ${groqRes.status}. Returned fallback topics.`;
        } else {
          const groqData = await groqRes.json();
          const parsed = parseAIJson(groqData?.choices?.[0]?.message?.content || "[]");
          topics = normalizeTopics(parsed, numTopics, fallbackTopics);
          source = "groq";
        }
      } catch (err: any) {
        warning = `Groq request failed: ${err?.message || "unknown error"}. Returned fallback topics.`;
      }
    } else {
      warning = "GROQ_API_KEY not configured. Returned fallback topics.";
    }

    return new Response(JSON.stringify({ topics, source, warning: warning || undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Research topics error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
