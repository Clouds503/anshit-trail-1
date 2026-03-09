import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
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

const SEO_SYSTEM_PROMPT = `You are a senior technical SEO strategist for a premium IT training brand.
Generate accurate, high-intent, and implementation-ready SEO metadata for Indian search context.
Return strict JSON only without markdown fences.`;

const ENRICH_SYSTEM_PROMPT = `You are a senior website content architect and conversion copy strategist.
Generate clean, high-quality content blocks for modern educational pages.
Output English only.
Return strict JSON only with the exact keys requested.`;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "from",
  "by",
  "is",
  "are",
  "be",
  "as",
  "your",
  "you",
  "our",
  "we",
  "it",
]);

const CANONICAL_ALIAS_MAP = new Map<string, string>([
  ["/home", "/"],
  ["/about-us", "/about"],
  ["/courses", "/programs"],
  ["/blogs", "/blog"],
  ["/privacy-policy", "/privacy"],
  ["/terms-condition", "/terms"],
  ["/terms-conditions", "/terms"],
  ["/terms-and-conditions", "/terms"],
  ["/terms-of-service", "/terms"],
  ["/refund-policy", "/refund"],
]);

type JsonShape = "any" | "object" | "array";
type SeoLevel = "basic" | "intermediate" | "advanced" | "master";
type PageType =
  | "home"
  | "about"
  | "contact"
  | "legal"
  | "enroll"
  | "program_list"
  | "program_detail"
  | "blog_list"
  | "blog_post"
  | "other";

type BlogPerformance = {
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
  weak: boolean;
  weak_score: number;
};

type PageCandidate = {
  path: string;
  name: string;
  page_type: PageType;
  content?: string;
  sub_sections?: string[];
  source_id?: string;
  updated_at?: string;
  meta?: Record<string, unknown>;
  performance?: BlogPerformance;
  source_hash?: string;
};

type ExistingSeo = {
  page_path: string;
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  canonical_url?: string | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[] | null;
  schema_markup?: unknown;
  alt_texts?: unknown;
  internal_links?: unknown;
  heading_suggestions?: unknown;
  robots_directive?: string | null;
  indexing_enabled?: boolean | null;
  source_hash?: string | null;
  updated_at?: string | null;
};

type EnrichedBlock =
  | { type: "heading" | "subheading" | "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; alt: string; image_prompt?: string };

type QualityResult = {
  score: number;
  issues: string[];
};

type TechnicalFindingStatus = "pass" | "warn" | "fail";
type TechnicalFixType = "auto_fixable" | "requires_hosting" | "off_page";

type TechnicalFinding = {
  id: string;
  category: string;
  status: TechnicalFindingStatus;
  fix_type: TechnicalFixType;
  message: string;
  recommendation: string;
  details?: Record<string, unknown>;
};

type TechnicalAuditResult = {
  score: number;
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  findings: TechnicalFinding[];
  checked_url: string;
};

function parseSettingValue(value: unknown): unknown {
  let current: unknown = value;
  for (let i = 0; i < 3; i++) {
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed) return "";
    try {
      current = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return current;
}

function toSettingsMap(rows: Array<{ key: string; value: unknown }> | null): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const row of rows || []) map[row.key] = parseSettingValue(row.value);
  return map;
}

function readSettingString(settings: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = `${raw || ""}`.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname || "/";
    } catch {
      return null;
    }
  }

  if (!value.startsWith("/")) value = `/${value}`;
  value = value.replace(/\/{2,}/g, "/");
  value = value.length > 1 ? value.replace(/\/+$/, "") : value;
  value = CANONICAL_ALIAS_MAP.get(value) || value;
  return value;
}

function canonicalizePath(raw: string, fallback = "/"): string {
  const normalized = normalizePath(raw);
  return normalized || fallback;
}

function stripSlash(path: string): string {
  if (path === "/") return "home";
  return path.replace(/^\/+/, "");
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function tokenize(input: string): string[] {
  return `${input || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const token of setA) if (setB.has(token)) overlap += 1;
  const union = new Set([...setA, ...setB]).size;
  return union ? overlap / union : 0;
}

function toShortContext(raw: unknown, limit = 800): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw.slice(0, limit);
  try {
    return JSON.stringify(raw).slice(0, limit);
  } catch {
    return "";
  }
}

function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stableSortValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableSortValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = stableSortValue(value[key]);
    return out;
  }
  return value;
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(stableSortValue(value));
  } catch {
    return "";
  }
}

function ensureShape(parsed: any, shape: JsonShape): any {
  if (shape === "array") return Array.isArray(parsed) ? parsed : [parsed];
  if (shape === "object") return Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
  return parsed;
}

async function callGroqRaw(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature = 0.4,
  model = "llama-3.3-70b-versatile",
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq returned empty response");
  return `${raw}`;
}

async function repairGroqJson(apiKey: string, malformedJson: string, shape: JsonShape): Promise<any> {
  const shapeRule =
    shape === "array"
      ? "Return ONLY a valid JSON array."
      : shape === "object"
        ? "Return ONLY a valid JSON object."
        : "Return ONLY valid JSON.";
  const repairPrompt = `Repair the following malformed JSON without changing its meaning.
${shapeRule}
Rules:
- Keep keys and values semantically same.
- Escape invalid characters.
- Remove trailing commas.
- If truncated, safely close structures.
- No markdown or explanation.

Malformed JSON:
${malformedJson.slice(0, 28000)}`;

  const repairedRaw = await callGroqRaw(
    apiKey,
    "You repair malformed JSON into strict valid JSON.",
    repairPrompt,
    3500,
    0,
    "llama-3.1-8b-instant",
  );
  return ensureShape(parseAIJson(repairedRaw), shape);
}

async function callGroqJson(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature = 0.4,
  shape: JsonShape = "any",
) {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const raw = await callGroqRaw(apiKey, systemPrompt, userPrompt, maxTokens, temperature, model);
      try {
        return ensureShape(parseAIJson(raw), shape);
      } catch (parseErr: any) {
        console.warn(`auto-seo parse failed on ${model}; attempting repair.`, parseErr?.message || parseErr);
        return await repairGroqJson(apiKey, raw, shape);
      }
    } catch (err) {
      lastError = err;
      console.warn(`auto-seo Groq call failed on ${model}:`, (err as any)?.message || err);
    }
  }
  throw lastError || new Error("Groq failed for all models");
}

function sanitizeKeywordList(raw: unknown, fallback: string[]): string[] {
  const values = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = `${value || ""}`.trim().replace(/\s+/g, " ");
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 15) break;
  }
  if (out.length) return out;
  return fallback.filter(Boolean).slice(0, 15);
}

function normalizeTextKey(value: unknown): string {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHeadingSuggestions(raw: unknown, fallbackTitle: string): { h1: string; h2s: string[] } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const h1 = `${source.h1 || fallbackTitle}`.trim().slice(0, 90) || fallbackTitle;
  const h2Candidates = Array.isArray(source.h2s)
    ? source.h2s.map((item) => `${item || ""}`.trim()).filter(Boolean).slice(0, 10)
    : [`Why ${fallbackTitle}`, `How to learn ${fallbackTitle}`, `${fallbackTitle} career roadmap`];
  const h2s: string[] = [];
  const seen = new Set<string>([normalizeTextKey(h1)]);
  for (const candidate of h2Candidates) {
    const clean = trimToLength(candidate, 90);
    const key = normalizeTextKey(clean);
    if (!clean || !key || seen.has(key)) continue;
    seen.add(key);
    h2s.push(clean);
    if (h2s.length >= 8) break;
  }
  if (!h2s.length) {
    const fallbacks = [`Why ${fallbackTitle}`, `How to learn ${fallbackTitle}`, `${fallbackTitle} career roadmap`];
    for (const fallback of fallbacks) {
      const clean = trimToLength(fallback, 90);
      const key = normalizeTextKey(clean);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      h2s.push(clean);
    }
  }
  return { h1, h2s };
}

function sanitizeAltTexts(raw: unknown, page: PageCandidate, focusKeyword: string): Record<string, string> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const k = `${key || ""}`.trim().slice(0, 40);
    const v = `${value || ""}`.trim().slice(0, 140);
    if (!k || !v) continue;
    out[k] = v;
  }
  if (!Object.keys(out).length) {
    out.hero = `${page.name} - ${focusKeyword}`;
    out.section_visual = `${page.name} learning journey visual`;
    out.feature_graphic = `${focusKeyword} practical implementation visual`;
  }
  return out;
}

function normalizeRobotsDirective(value: unknown, indexingEnabled: boolean): string {
  if (!indexingEnabled) return "noindex, nofollow";
  const raw = `${value || ""}`.toLowerCase().replace(/\s+/g, "");
  if (!raw) return "index, follow";
  if (raw.includes("noindex")) return "noindex, follow";
  return "index, follow";
}

function trimToLength(value: string, maxLength: number): string {
  const normalized = `${value || ""}`.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
}

function ensureUniqueText(
  input: string,
  usedSet: Set<string>,
  fallback: string,
  maxLength: number,
  suffixHint: string,
): string {
  let base = trimToLength(input || fallback, maxLength);
  if (!base) base = trimToLength(fallback, maxLength);
  let candidate = base;
  let counter = 2;
  while (usedSet.has(candidate.toLowerCase())) {
    const suffix = counter === 2 ? ` | ${suffixHint}` : ` | ${suffixHint} ${counter}`;
    candidate = trimToLength(base, Math.max(10, maxLength - suffix.length)) + suffix;
    counter += 1;
    if (counter > 9) break;
  }
  usedSet.add(candidate.toLowerCase());
  return candidate;
}

function scoreWeakness(impressions: number, ctr: number, avgPosition: number): number {
  let score = 0;
  if (impressions >= 120 && ctr < 0.02) score += 2;
  if (impressions >= 250 && ctr < 0.015) score += 2;
  if (avgPosition > 18) score += 2;
  if (avgPosition > 28) score += 1;
  return score;
}

function buildFallbackSeoEntries(pages: PageCandidate[]): any[] {
  return pages.map((page) => {
    const pageName = page.name || "Clouds Trail";
    const baseKeyword = page.path === "/" ? "IT training institute in India" : `${pageName} Clouds Trail`;
    const keywords = sanitizeKeywordList(
      [
        baseKeyword,
        `${pageName} course`,
        "Clouds Trail",
        "IT courses India",
        "placement focused tech training",
      ],
      ["Clouds Trail", "IT courses India"],
    );
    return {
      page_path: page.path,
      title: trimToLength(`${pageName} | Clouds Trail`, 60),
      description: trimToLength(
        `Explore ${pageName} at Clouds Trail with practical, placement-focused IT training for learners in India.`,
        155,
      ),
      canonical_url: page.path,
      keywords,
      focus_keyword: trimToLength(baseKeyword, 90),
      secondary_keywords: keywords.slice(0, 5),
      robots_directive: "index, follow",
      indexing_enabled: true,
    };
  });
}

function buildHighEnd3DPrompt(basePrompt: string, context: string): string {
  return [
    "MASTER QUALITY 3D VISUAL BRIEF.",
    basePrompt,
    `Context: ${context}.`,
    "Style: cinematic premium 3D, physically based rendering, strong depth layering, clean composition, realistic materials, and polished lighting.",
    "This must be a pure visual scene, never a website screenshot, dashboard UI, poster, banner, or app mockup.",
    "Do not render words, letters, typography, banners, posters, UI text, or glyphs.",
    "No logos, no watermarks, no non-English scripts, no random characters.",
    "If screens or boards are present, they must be blank or abstract with zero readable characters.",
  ].join(" ");
}

async function generateViaGenerateImageFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    let message = err;
    try {
      const parsed = err ? JSON.parse(err) : null;
      const parsedMessage = parsed?.error?.toString?.() || parsed?.message?.toString?.();
      if (parsedMessage) message = parsedMessage;
    } catch {
      // Keep raw text.
    }
    throw new HttpError(res.status, `generate-image function failed (${res.status}): ${message || "unknown error"}`);
  }

  const body = await res.json().catch(() => null);
  const url = body?.url?.toString?.() || "";
  if (!url) throw new HttpError(502, "generate-image returned empty url");
  return url;
}

function buildPerformanceMap(
  blogs: Array<{ id: string; slug: string }>,
  metricRows: Array<{ blog_id: string; impressions: number; clicks: number; avg_position: number | null }> | null,
): Map<string, BlogPerformance> {
  const byBlogId = new Map<string, { impressions: number; clicks: number; positionSum: number; positionCount: number }>();
  for (const row of metricRows || []) {
    const existing = byBlogId.get(row.blog_id) || { impressions: 0, clicks: 0, positionSum: 0, positionCount: 0 };
    existing.impressions += Number(row.impressions || 0);
    existing.clicks += Number(row.clicks || 0);
    const pos = Number(row.avg_position || 0);
    if (pos > 0) {
      existing.positionSum += pos;
      existing.positionCount += 1;
    }
    byBlogId.set(row.blog_id, existing);
  }

  const byPath = new Map<string, BlogPerformance>();
  for (const blog of blogs) {
    const agg = byBlogId.get(blog.id);
    if (!agg) continue;
    const ctr = agg.impressions > 0 ? agg.clicks / agg.impressions : 0;
    const avgPosition = agg.positionCount > 0 ? agg.positionSum / agg.positionCount : 0;
    const weakScore = scoreWeakness(agg.impressions, ctr, avgPosition);
    byPath.set(`/blog/${blog.slug}`, {
      impressions: agg.impressions,
      clicks: agg.clicks,
      ctr,
      avg_position: avgPosition,
      weak: weakScore > 0,
      weak_score: weakScore,
    });
  }
  return byPath;
}

function buildSourceSnapshot(page: PageCandidate): string {
  return stableStringify({
    path: page.path,
    name: page.name,
    page_type: page.page_type,
    sub_sections: page.sub_sections || [],
    content: toShortContext(page.content, 3000),
    updated_at: page.updated_at || null,
    source_id: page.source_id || null,
    meta: page.meta || {},
  });
}

async function attachSourceHashes(pages: PageCandidate[]): Promise<void> {
  const hashes = await Promise.all(pages.map((page) => sha256Hex(buildSourceSnapshot(page))));
  for (let i = 0; i < pages.length; i++) pages[i].source_hash = hashes[i];
}

function buildPagePerformanceHint(page: PageCandidate): string {
  if (!page.performance) return "performance: n/a";
  return `impressions_30d=${page.performance.impressions}, clicks_30d=${page.performance.clicks}, ctr_30d=${(
    page.performance.ctr * 100
  ).toFixed(2)}%, avg_position_30d=${page.performance.avg_position.toFixed(2)}, priority=${
    page.performance.weak ? "weak_page_optimize_ctr" : "normal"
  }`;
}

function buildSeoPromptChunk(chunk: PageCandidate[], level: SeoLevel): string {
  const levelInstructions =
    level === "master"
      ? `MASTER LEVEL:
- focus_keyword (single strongest keyword)
- secondary_keywords (3-5)
- keywords (10-15 including long-tail and India intent)
- alt_texts object
- internal_links: [{anchor_text,target_path}]
- heading_suggestions: {h1,h2s[]}
- schema_markup: JSON-LD object
- robots_directive
- indexing_enabled`
      : level === "advanced"
        ? `ADVANCED:
- focus_keyword, secondary_keywords, keywords (10-12)
- alt_texts, internal_links, heading_suggestions, schema_markup, robots_directive, indexing_enabled`
        : level === "intermediate"
          ? `INTERMEDIATE:
- focus_keyword, secondary_keywords, keywords (8-10), alt_texts`
          : `BASIC:
- keywords (8)`;

  return `Generate SEO metadata for these Clouds Trail pages.

${levelInstructions}

Pages:
${chunk
  .map((page) =>
    `- path=${page.path} | name=${page.name} | type=${page.page_type} | sections=${(page.sub_sections || []).join(", ") || "n/a"} | context=${toShortContext(page.content, 220)} | ${buildPagePerformanceHint(page)}`,
  )
  .join("\n")}

Rules:
- Titles <= 60 chars.
- Descriptions <= 155 chars.
- Canonical URL must be a clean path only.
- For weak pages, improve CTR intent in title + description.
- Internal link targets must be valid site paths from above list or major hubs (/programs,/blog,/enroll,/contact).
- Avoid duplicate heading texts within each page suggestion.
- Use varied internal anchor texts; avoid repeating generic anchors.
- Return ONLY valid JSON array.

Output schema per item:
{
  "page_path": "string",
  "title": "string",
  "description": "string",
  "canonical_url": "string path",
  "keywords": ["..."],
  "focus_keyword": "string",
  "secondary_keywords": ["..."],
  "alt_texts": {"key":"value"},
  "internal_links": [{"anchor_text":"...","target_path":"/..."}],
  "heading_suggestions": {"h1":"...","h2s":["..."]},
  "schema_markup": {...},
  "robots_directive": "index, follow",
  "indexing_enabled": true
}`;
}

function looksLikeFaqPage(page: PageCandidate): boolean {
  const sections = (page.sub_sections || []).map((s) => s.toLowerCase());
  if (sections.some((s) => s.includes("faq"))) return true;
  return page.page_type === "program_detail" || page.path === "/about" || page.path === "/";
}

function buildBreadcrumbSchema(path: string, name: string, siteUrl: string) {
  const segments = path === "/" ? [] : path.replace(/^\/+/, "").split("/");
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${siteUrl}/`,
    },
  ];
  let running = "";
  for (let i = 0; i < segments.length; i++) {
    running += `/${segments[i]}`;
    items.push({
      "@type": "ListItem",
      position: i + 2,
      name: i === segments.length - 1 ? name : segments[i].replace(/-/g, " "),
      item: `${siteUrl}${running}`,
    });
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function pickFaqsForPage(page: PageCandidate, allFaqs: Array<{ question: string; answer: string; category?: string }>) {
  if (!looksLikeFaqPage(page)) return [];
  const pageTokens = tokenize(`${page.name} ${page.path}`);
  const scored = allFaqs.map((faq) => {
    const score = jaccardSimilarity(pageTokens, tokenize(`${faq.question} ${faq.category || ""}`));
    return { faq, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.filter((item) => item.score > 0.02).slice(0, 5).map((item) => item.faq);
  if (selected.length) return selected;
  return allFaqs.slice(0, 3);
}

function buildSchemaMarkup(
  page: PageCandidate,
  siteUrl: string,
  faqItems: Array<{ question: string; answer: string; category?: string }>,
): Record<string, unknown> {
  const url = `${siteUrl}${page.path}`;
  const graph: Record<string, unknown>[] = [];

  if (page.page_type === "home") {
    graph.push({
      "@type": "WebSite",
      name: "Clouds Trail",
      url: `${siteUrl}/`,
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/blog?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
  } else if (page.page_type === "blog_post") {
    graph.push({
      "@type": "BlogPosting",
      headline: page.name,
      description: `${page.meta?.excerpt || page.content || ""}`.slice(0, 200),
      author: {
        "@type": "Organization",
        name: `${page.meta?.author || "Clouds Trail"}`,
      },
      mainEntityOfPage: url,
      datePublished: toIsoDate(`${page.meta?.created_at || ""}`) || toIsoDate(page.updated_at || "") || undefined,
      dateModified: toIsoDate(page.updated_at || "") || undefined,
      image: `${page.meta?.image_url || ""}` || undefined,
    });
  } else if (page.page_type === "program_detail") {
    graph.push({
      "@type": "Course",
      name: page.name,
      description: `${page.content || ""}`.slice(0, 280),
      provider: {
        "@type": "Organization",
        name: "Clouds Trail",
        sameAs: siteUrl,
      },
      educationalLevel: `${page.meta?.level || ""}` || undefined,
      timeRequired: `${page.meta?.duration || ""}` || undefined,
      url,
    });
  } else if (page.page_type === "program_list" || page.page_type === "blog_list") {
    graph.push({
      "@type": "CollectionPage",
      name: page.name,
      url,
      description: `${page.content || page.name}`.slice(0, 240),
    });
  } else {
    graph.push({
      "@type": "WebPage",
      name: page.name,
      url,
      description: `${page.content || page.name}`.slice(0, 240),
    });
  }

  graph.push(buildBreadcrumbSchema(page.path, page.name, siteUrl));

  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function normalizeInternalLinks(
  raw: unknown,
  pagePath: string,
  allPathsSet: Set<string>,
): Array<{ anchor_text: string; target_path: string }> {
  const out: Array<{ anchor_text: string; target_path: string }> = [];
  const seenTargets = new Set<string>();
  const seenAnchors = new Set<string>();
  const list = Array.isArray(raw) ? raw : [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const anchor = trimToLength(`${(item as any).anchor_text || ""}`, 70);
    const anchorKey = normalizeTextKey(anchor);
    const target = canonicalizePath(`${(item as any).target_path || ""}`, "");
    if (!anchor || !target || target === pagePath) continue;
    if (!allPathsSet.has(target) && !["/programs", "/blog", "/enroll", "/contact"].includes(target)) continue;
    if (!anchorKey || seenAnchors.has(anchorKey)) continue;
    if (seenTargets.has(target)) continue;
    seenTargets.add(target);
    seenAnchors.add(anchorKey);
    out.push({ anchor_text: anchor, target_path: target });
    if (out.length >= 8) break;
  }
  return out;
}

function buildIntelligentInternalLinks(
  page: PageCandidate,
  allPages: PageCandidate[],
  existing: Array<{ anchor_text: string; target_path: string }>,
): Array<{ anchor_text: string; target_path: string }> {
  const pageTokens = tokenize(`${page.name} ${page.content || ""} ${(page.sub_sections || []).join(" ")}`);
  const scored = allPages
    .filter((candidate) => candidate.path !== page.path)
    .map((candidate) => {
      const candidateTokens = tokenize(`${candidate.name} ${candidate.content || ""}`);
      let score = jaccardSimilarity(pageTokens, candidateTokens);
      if (page.page_type === "blog_post" && candidate.page_type === "program_detail") score += 0.15;
      if (page.page_type === "program_detail" && candidate.page_type === "enroll") score += 0.2;
      if (candidate.path === "/programs" || candidate.path === "/blog") score += 0.08;
      if (candidate.path === "/enroll") score += 0.05;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const anchorsUsed = new Set(existing.map((item) => item.anchor_text.toLowerCase()));
  const targetsUsed = new Set(existing.map((item) => item.target_path));
  const result = [...existing];

  for (const item of scored) {
    if (item.score < 0.03) continue;
    if (targetsUsed.has(item.candidate.path)) continue;
    const anchorTemplates = [
      `Explore ${item.candidate.name}`,
      `${item.candidate.name} guide`,
      `${item.candidate.name} course details`,
    ];
    let anchor = anchorTemplates.find((candidate) => !anchorsUsed.has(candidate.toLowerCase())) || anchorTemplates[0];
    anchor = trimToLength(anchor, 70);
    anchorsUsed.add(anchor.toLowerCase());
    targetsUsed.add(item.candidate.path);
    result.push({ anchor_text: anchor, target_path: item.candidate.path });
    if (result.length >= 8) break;
  }

  if (!result.some((item) => item.target_path === "/programs") && page.path !== "/programs") {
    const primary = trimToLength(`Browse IT programs for ${page.name}`, 70);
    const fallback = "Browse all IT programs";
    const anchor = !anchorsUsed.has(primary.toLowerCase()) ? primary : fallback;
    if (!anchorsUsed.has(anchor.toLowerCase()) && !targetsUsed.has("/programs")) {
      result.push({ anchor_text: anchor, target_path: "/programs" });
      anchorsUsed.add(anchor.toLowerCase());
      targetsUsed.add("/programs");
    }
  }
  if (!result.some((item) => item.target_path === "/blog") && page.path !== "/blog") {
    const primary = trimToLength(`Read blog guides for ${page.name}`, 70);
    const fallback = "Read latest tech blogs";
    const anchor = !anchorsUsed.has(primary.toLowerCase()) ? primary : fallback;
    if (!anchorsUsed.has(anchor.toLowerCase()) && !targetsUsed.has("/blog")) {
      result.push({ anchor_text: anchor, target_path: "/blog" });
      anchorsUsed.add(anchor.toLowerCase());
      targetsUsed.add("/blog");
    }
  }

  return result.slice(0, 8);
}

function evaluateQuality(upsertData: Record<string, unknown>, page: PageCandidate): QualityResult {
  const issues: string[] = [];
  let score = 100;
  const title = `${upsertData.title || ""}`;
  const description = `${upsertData.description || ""}`;
  const focus = `${upsertData.focus_keyword || ""}`.toLowerCase();
  const keywords = Array.isArray(upsertData.keywords) ? upsertData.keywords : [];
  const internalLinks = Array.isArray(upsertData.internal_links) ? upsertData.internal_links : [];
  const canonical = `${upsertData.canonical_url || ""}`;
  const schema = upsertData.schema_markup;
  const heading = upsertData.heading_suggestions as { h1?: unknown; h2s?: unknown } | undefined;

  if (title.length < 40 || title.length > 60) {
    score -= 10;
    issues.push("title_length_out_of_range");
  }
  if (description.length < 120 || description.length > 155) {
    score -= 10;
    issues.push("description_length_out_of_range");
  }
  if (focus && !title.toLowerCase().includes(focus)) {
    score -= 8;
    issues.push("focus_keyword_missing_in_title");
  }
  if (keywords.length < 8) {
    score -= 12;
    issues.push("insufficient_keywords");
  }
  if (internalLinks.length < 3) {
    score -= 8;
    issues.push("internal_links_too_few");
  }
  const duplicateInternalAnchors = (() => {
    const seen = new Set<string>();
    for (const item of internalLinks) {
      const key = normalizeTextKey((item as any)?.anchor_text || "");
      if (!key) continue;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  })();
  if (duplicateInternalAnchors) {
    score -= 6;
    issues.push("duplicate_internal_anchor_text");
  }
  const headingDuplicate = (() => {
    const values = [`${heading?.h1 || ""}`];
    if (Array.isArray(heading?.h2s)) values.push(...heading.h2s.map((item) => `${item || ""}`));
    const seen = new Set<string>();
    for (const value of values) {
      const key = normalizeTextKey(value);
      if (!key) continue;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  })();
  if (headingDuplicate) {
    score -= 6;
    issues.push("duplicate_heading_suggestions");
  }
  if (canonical !== page.path) {
    score -= 6;
    issues.push("canonical_not_normalized");
  }
  if (!schema || typeof schema !== "object") {
    score -= 15;
    issues.push("schema_missing");
  }

  return { score: Math.max(0, score), issues };
}

function isOlderThanDays(raw: string | null | undefined, days: number): boolean {
  if (!raw) return true;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return true;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date.getTime() < cutoff;
}

async function fetchExistingSeoRows(supabase: any, targetPaths: string[]): Promise<ExistingSeo[]> {
  const withSourceHashColumns =
    "page_path,title,description,keywords,canonical_url,focus_keyword,secondary_keywords,schema_markup,alt_texts,internal_links,heading_suggestions,robots_directive,indexing_enabled,source_hash,updated_at";

  let query = await supabase.from("seo_settings").select(withSourceHashColumns).in("page_path", targetPaths);
  if (!query.error) return query.data || [];

  if (/source_hash/i.test(`${query.error.message || ""}`)) {
    query = await supabase
      .from("seo_settings")
      .select(
        "page_path,title,description,keywords,canonical_url,focus_keyword,secondary_keywords,schema_markup,alt_texts,internal_links,heading_suggestions,robots_directive,indexing_enabled,updated_at",
      )
      .in("page_path", targetPaths);
    if (query.error) throw query.error;
    return (query.data || []).map((row: any) => ({ ...row, source_hash: null }));
  }

  throw query.error;
}

function hasSeoChanged(existing: ExistingSeo | undefined, candidate: Record<string, unknown>, sourceHash: string): boolean {
  if (!existing) return true;
  const compareKeys = [
    "title",
    "description",
    "keywords",
    "canonical_url",
    "focus_keyword",
    "secondary_keywords",
    "schema_markup",
    "alt_texts",
    "internal_links",
    "heading_suggestions",
    "robots_directive",
    "indexing_enabled",
    "source_hash",
  ];
  const currentComparable: Record<string, unknown> = { ...candidate, source_hash: sourceHash };
  for (const key of compareKeys) {
    const oldValue = (existing as any)[key];
    const newValue = (currentComparable as any)[key];
    if (stableStringify(oldValue) !== stableStringify(newValue)) return true;
  }
  return false;
}

function isRedirectStatus(status: number | null): boolean {
  if (!status) return false;
  return status >= 300 && status < 400;
}

type PageProbe = {
  url: string;
  initial_status: number | null;
  initial_location: string;
  final_url: string;
  final_status: number | null;
  response_time_ms: number | null;
  content_type: string;
  html: string;
  error?: string;
};

async function fetchPageProbe(url: string, timeoutMs = 12000): Promise<PageProbe> {
  const fallback: PageProbe = {
    url,
    initial_status: null,
    initial_location: "",
    final_url: url,
    final_status: null,
    response_time_ms: null,
    content_type: "",
    html: "",
  };
  const doFetch = async (targetUrl: string, redirect: RequestRedirect) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        redirect,
        signal: controller.signal,
        headers: {
          "user-agent": "CloudsTrailAutoSEO/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });
      const elapsed = Date.now() - start;
      return { response, elapsed };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const first = await doFetch(url, "manual");
    const initialLocation = first.response.headers.get("location") || "";
    let finalUrl = first.response.url || url;
    let finalStatus = first.response.status;
    let contentType = (first.response.headers.get("content-type") || "").toLowerCase();
    let html = "";
    let responseTimeMs = first.elapsed;
    const shouldFollowRedirect = isRedirectStatus(first.response.status) && !!initialLocation;

    if (shouldFollowRedirect) {
      try {
        finalUrl = new URL(initialLocation, url).toString();
      } catch {
        finalUrl = url;
      }
    }

    if (!shouldFollowRedirect && contentType.includes("text/html")) {
      html = (await first.response.text()).slice(0, 500_000);
    }

    if (shouldFollowRedirect && finalUrl) {
      try {
        const last = await doFetch(finalUrl, "follow");
        finalStatus = last.response.status;
        responseTimeMs = last.elapsed;
        contentType = (last.response.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html")) {
          html = (await last.response.text()).slice(0, 500_000);
        }
      } catch (err: any) {
        return {
          ...fallback,
          initial_status: first.response.status,
          initial_location: initialLocation,
          final_url: finalUrl,
          final_status: finalStatus,
          response_time_ms: responseTimeMs,
          content_type: contentType,
          error: err?.message || "final_fetch_failed",
        };
      }
    }

    return {
      ...fallback,
      initial_status: first.response.status,
      initial_location: initialLocation,
      final_url: finalUrl,
      final_status: finalStatus,
      response_time_ms: responseTimeMs,
      content_type: contentType,
      html,
    };
  } catch (err: any) {
    return { ...fallback, error: err?.message || "probe_failed" };
  }
}

function parseBlockArray(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

function analyzeHomeHeadings(homeContent: unknown): {
  heading_count: number;
  text_block_count: number;
  duplicate_headings: string[];
  excessive_headings: boolean;
} {
  const blocks = parseBlockArray(homeContent);
  const headingValues: string[] = [];
  let textBlockCount = 0;

  for (const block of blocks) {
    const type = `${block.type || ""}`.toLowerCase();
    if (type === "heading" || type === "subheading") {
      const text = trimToLength(`${block.text || ""}`, 140);
      if (text) headingValues.push(text);
      continue;
    }
    if (type === "paragraph") {
      if (`${block.text || ""}`.trim()) textBlockCount += 1;
      continue;
    }
    if (type === "list") {
      const items = Array.isArray(block.items) ? block.items.filter((item) => `${item || ""}`.trim()) : [];
      if (items.length) textBlockCount += 1;
    }
  }

  const duplicateHeadings: string[] = [];
  const seen = new Set<string>();
  const duplicateSeen = new Set<string>();
  for (const heading of headingValues) {
    const key = normalizeTextKey(heading);
    if (!key) continue;
    if (seen.has(key) && !duplicateSeen.has(key)) {
      duplicateSeen.add(key);
      duplicateHeadings.push(heading);
      continue;
    }
    seen.add(key);
  }

  const headingCount = headingValues.length;
  const maxReasonableHeadings = Math.max(12, Math.ceil(textBlockCount * 0.8) + 6);
  const excessiveHeadings = headingCount > maxReasonableHeadings;
  return {
    heading_count: headingCount,
    text_block_count: textBlockCount,
    duplicate_headings: duplicateHeadings,
    excessive_headings: excessiveHeadings,
  };
}

function collectDuplicateAnchorTexts(
  rows: Array<{ page_path: string; internal_links: unknown }>,
): Array<{ anchor_text: string; count: number; pages: string[] }> {
  const byKey = new Map<string, { anchor_text: string; count: number; pages: Set<string> }>();

  for (const row of rows) {
    const pagePath = canonicalizePath(`${row.page_path || ""}`, "");
    if (!pagePath) continue;
    const links = Array.isArray(row.internal_links) ? row.internal_links : [];
    const seenOnPage = new Set<string>();
    for (const link of links) {
      const anchor = trimToLength(`${(link as any)?.anchor_text || ""}`, 100);
      const key = normalizeTextKey(anchor);
      if (!anchor || !key || seenOnPage.has(key)) continue;
      seenOnPage.add(key);
      const existing = byKey.get(key) || { anchor_text: anchor, count: 0, pages: new Set<string>() };
      existing.count += 1;
      existing.pages.add(pagePath);
      byKey.set(key, existing);
    }
  }

  return [...byKey.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((item) => ({
      anchor_text: item.anchor_text,
      count: item.count,
      pages: [...item.pages].slice(0, 8),
    }));
}

async function runTechnicalSeoAudit(
  siteUrl: string,
  homeContent: unknown,
  internalLinkRows: Array<{ page_path: string; internal_links: unknown }>,
): Promise<TechnicalAuditResult> {
  const findings: TechnicalFinding[] = [];
  const pushFinding = (finding: TechnicalFinding) => findings.push(finding);

  let parsedSiteUrl: URL;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    pushFinding({
      id: "site_url_invalid",
      category: "technical_setup",
      status: "fail",
      fix_type: "requires_hosting",
      message: `Site URL is invalid: ${siteUrl}`,
      recommendation: "Set a valid `site_url` in site settings so auto-seo can run technical checks.",
    });
    return {
      score: 0,
      summary: { pass: 0, warn: 0, fail: 1 },
      findings,
      checked_url: siteUrl,
    };
  }

  const canonicalHost = parsedSiteUrl.host.toLowerCase();
  const canonicalOrigin = `${parsedSiteUrl.protocol}//${canonicalHost}`;
  const canonicalRoot = `${canonicalOrigin}/`;
  const alternateHost = canonicalHost.startsWith("www.") ? canonicalHost.slice(4) : `www.${canonicalHost}`;
  const alternateRoot = `${parsedSiteUrl.protocol}//${alternateHost}/`;
  const httpRoot = `http://${canonicalHost}/`;
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(parsedSiteUrl.hostname.toLowerCase()) || parsedSiteUrl.hostname.endsWith(".local");

  const [canonicalProbe, alternateProbe, httpProbe] = isLocalHost
    ? [await fetchPageProbe(canonicalRoot), null, null]
    : await Promise.all([fetchPageProbe(canonicalRoot), fetchPageProbe(alternateRoot), fetchPageProbe(httpRoot)]);

  const canonicalHtml = canonicalProbe.html || "";
  const jsFileCount = (canonicalHtml.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || []).length;
  const hasAppleTouchIcon = /<link\b[^>]*\brel\s*=\s*["'][^"']*apple-touch-icon[^"']*["'][^>]*>/i.test(canonicalHtml);
  const headerHasCharset = /charset\s*=\s*utf-?8/i.test(canonicalProbe.content_type || "");
  const metaHasCharset = /<meta\b[^>]*charset\s*=\s*["']?\s*utf-?8/i.test(canonicalHtml);

  const canonicalTagMatch = canonicalHtml.match(
    /<link\b[^>]*\brel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/i,
  );
  let canonicalTagHost = "";
  if (canonicalTagMatch?.[1]) {
    try {
      canonicalTagHost = new URL(canonicalTagMatch[1], canonicalOrigin).host.toLowerCase();
    } catch {
      canonicalTagHost = "";
    }
  }

  const homeHeadingStats = analyzeHomeHeadings(homeContent);
  const duplicateAnchors = collectDuplicateAnchorTexts(internalLinkRows);

  if (isLocalHost) {
    pushFinding({
      id: "canonical_redirect_check",
      category: "http_redirects",
      status: "warn",
      fix_type: "requires_hosting",
      message: "Canonical host redirect checks are skipped for localhost/local domains.",
      recommendation: "Run this check on production domain to validate www/non-www 301 behavior.",
      details: { host: canonicalHost },
    });
  } else {
    const alternateRedirectUrl = (() => {
      try {
        if (!alternateProbe?.initial_location) return null;
        return new URL(alternateProbe.initial_location, alternateRoot);
      } catch {
        return null;
      }
    })();
    const redirectsToCanonicalHost =
      !!alternateProbe &&
      isRedirectStatus(alternateProbe.initial_status) &&
      alternateRedirectUrl?.host.toLowerCase() === canonicalHost;
    pushFinding({
      id: "canonical_redirect_check",
      category: "http_redirects",
      status: redirectsToCanonicalHost ? "pass" : "fail",
      fix_type: "requires_hosting",
      message: redirectsToCanonicalHost
        ? "www/non-www canonical host redirect is configured."
        : "www/non-www canonical redirect is missing or not pointing to canonical host.",
      recommendation:
        "Configure a 301 redirect from the non-canonical host to the canonical host in one hop (same path and query).",
      details: {
        canonical_host: canonicalHost,
        alternate_host: alternateHost,
        alternate_status: alternateProbe?.initial_status ?? null,
        alternate_location: alternateProbe?.initial_location || "",
      },
    });

    const httpRedirectUrl = (() => {
      try {
        if (!httpProbe?.initial_location) return null;
        return new URL(httpProbe.initial_location, httpRoot);
      } catch {
        return null;
      }
    })();
    const redirectsHttpToHttps =
      !!httpProbe &&
      isRedirectStatus(httpProbe.initial_status) &&
      httpRedirectUrl?.protocol === "https:" &&
      httpRedirectUrl?.host.toLowerCase() === canonicalHost;
    pushFinding({
      id: "https_redirect_check",
      category: "http_redirects",
      status: redirectsHttpToHttps ? "pass" : "warn",
      fix_type: "requires_hosting",
      message: redirectsHttpToHttps ? "HTTP to HTTPS redirect is configured." : "HTTP to HTTPS redirect could not be verified.",
      recommendation: "Force HTTPS with a 301 redirect and avoid multi-hop chains.",
      details: {
        http_status: httpProbe?.initial_status ?? null,
        http_location: httpProbe?.initial_location || "",
      },
    });
  }

  pushFinding({
    id: "charset_header_check",
    category: "charset_encoding",
    status: headerHasCharset ? "pass" : "fail",
    fix_type: headerHasCharset ? "auto_fixable" : "requires_hosting",
    message: headerHasCharset
      ? "UTF-8 charset is present in the HTTP Content-Type header."
      : "Charset encoding is missing in HTTP headers.",
    recommendation:
      "Set `Content-Type: text/html; charset=UTF-8` for HTML responses at the server/CDN level. Keep `<meta charset=\"UTF-8\">` in HTML.",
    details: {
      content_type: canonicalProbe.content_type || "",
      meta_charset_present: metaHasCharset,
    },
  });

  pushFinding({
    id: "apple_touch_icon_check",
    category: "mobile_optimization",
    status: hasAppleTouchIcon ? "pass" : "fail",
    fix_type: "auto_fixable",
    message: hasAppleTouchIcon ? "Apple touch icon is present." : "No Apple touch icon tag found.",
    recommendation: "Add `<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\" sizes=\"180x180\">` to the page head.",
  });

  const jsStatus: TechnicalFindingStatus = jsFileCount > 4 ? "fail" : jsFileCount > 3 ? "warn" : "pass";
  pushFinding({
    id: "javascript_count_check",
    category: "performance",
    status: jsStatus,
    fix_type: "auto_fixable",
    message: `Homepage currently loads ${jsFileCount} external JavaScript file(s).`,
    recommendation: "Reduce JS requests and payload by consolidating scripts, removing unused code, and deferring non-critical JS.",
    details: { js_file_count: jsFileCount },
  });

  pushFinding({
    id: "duplicate_heading_text_check",
    category: "headings",
    status: homeHeadingStats.duplicate_headings.length ? "fail" : "pass",
    fix_type: "auto_fixable",
    message: homeHeadingStats.duplicate_headings.length
      ? `Duplicate heading texts detected (${homeHeadingStats.duplicate_headings.length}).`
      : "No duplicate heading texts detected in homepage content blocks.",
    recommendation: "Ensure each heading is unique and map headings to a clear H1-H2-H3 structure.",
    details: {
      duplicate_headings: homeHeadingStats.duplicate_headings.slice(0, 8),
      heading_count: homeHeadingStats.heading_count,
    },
  });

  pushFinding({
    id: "heading_density_check",
    category: "headings",
    status: homeHeadingStats.excessive_headings ? "warn" : "pass",
    fix_type: "auto_fixable",
    message: homeHeadingStats.excessive_headings
      ? `Heading density is high (${homeHeadingStats.heading_count} headings for ${homeHeadingStats.text_block_count} text blocks).`
      : "Heading volume is reasonably proportional to text volume.",
    recommendation: "Convert decorative headings into paragraph text and keep headings for section structure only.",
    details: {
      heading_count: homeHeadingStats.heading_count,
      text_block_count: homeHeadingStats.text_block_count,
    },
  });

  pushFinding({
    id: "duplicate_internal_anchor_check",
    category: "internal_links",
    status: duplicateAnchors.length ? "warn" : "pass",
    fix_type: "auto_fixable",
    message: duplicateAnchors.length
      ? `Some internal anchor texts are reused across pages (${duplicateAnchors.length} repeated anchors).`
      : "Internal anchor text variety looks healthy.",
    recommendation: "Use intent-specific, context-rich anchor text instead of repeating generic link phrases.",
    details: {
      repeated_anchors: duplicateAnchors.slice(0, 10),
    },
  });

  const responseTime = canonicalProbe.response_time_ms ?? null;
  const responseTimeStatus: TechnicalFindingStatus = responseTime === null ? "warn" : responseTime > 400 ? "fail" : "pass";
  pushFinding({
    id: "response_time_check",
    category: "performance",
    status: responseTimeStatus,
    fix_type: "requires_hosting",
    message:
      responseTime === null
        ? "Page response time could not be measured."
        : `Homepage response time is ${responseTime} ms (${(responseTime / 1000).toFixed(2)}s).`,
    recommendation: "Target <= 400 ms response time using CDN caching, compression, optimized queries, and reduced server work.",
    details: {
      response_time_ms: responseTime,
      checked_url: canonicalProbe.final_url || canonicalRoot,
      status_code: canonicalProbe.final_status,
    },
  });

  pushFinding({
    id: "backlinks_check",
    category: "backlinks",
    status: "warn",
    fix_type: "off_page",
    message: "Backlink count and referring domains require external link analysis and are usually outside on-page automation.",
    recommendation: "Run a recurring off-page campaign: digital PR, partner links, guest posts, and linkable assets.",
  });

  pushFinding({
    id: "canonical_tag_host_check",
    category: "http_redirects",
    status: canonicalTagHost && canonicalTagHost !== canonicalHost ? "fail" : "pass",
    fix_type: "auto_fixable",
    message:
      canonicalTagHost && canonicalTagHost !== canonicalHost
        ? `Canonical tag host (${canonicalTagHost}) does not match canonical host (${canonicalHost}).`
        : "Canonical tag host matches site canonical host.",
    recommendation: "Ensure canonical tag points to the preferred host and canonical path for each page.",
    details: {
      canonical_tag_host: canonicalTagHost || null,
      canonical_host: canonicalHost,
    },
  });

  const summary = findings.reduce(
    (acc, finding) => {
      acc[finding.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  const score = Math.max(0, 100 - summary.fail * 12 - summary.warn * 6);
  return {
    score,
    summary,
    findings,
    checked_url: canonicalProbe.final_url || canonicalRoot,
  };
}

function shouldEnrichPage(page: PageCandidate): boolean {
  return page.page_type !== "other";
}

function blocksToPlainText(blocks: Array<Record<string, unknown>>, maxLength = 4000): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = `${block.type || ""}`.toLowerCase();
    if (type === "heading" || type === "subheading" || type === "paragraph") {
      const text = trimToLength(`${block.text || ""}`, 1200);
      if (text) lines.push(text);
      continue;
    }
    if (type === "list") {
      const items = Array.isArray(block.items)
        ? block.items.map((item) => trimToLength(`${item || ""}`, 220)).filter(Boolean)
        : [];
      if (items.length) lines.push(items.join(". "));
    }
  }
  return trimToLength(lines.join(" ").replace(/\s+/g, " ").trim(), maxLength);
}

function blocksToMarkdown(blocks: Array<Record<string, unknown>>): string {
  const parts: string[] = [];

  for (const block of blocks) {
    const type = `${block.type || ""}`.toLowerCase();
    if (type === "heading") {
      const text = trimToLength(`${block.text || ""}`, 180);
      if (text) parts.push(`## ${text}`);
      continue;
    }
    if (type === "subheading") {
      const text = trimToLength(`${block.text || ""}`, 180);
      if (text) parts.push(`### ${text}`);
      continue;
    }
    if (type === "paragraph") {
      const text = trimToLength(`${block.text || ""}`, 1500);
      if (text) parts.push(text);
      continue;
    }
    if (type === "list") {
      const items = Array.isArray(block.items)
        ? block.items.map((item) => trimToLength(`${item || ""}`, 220)).filter(Boolean).slice(0, 12)
        : [];
      if (items.length) {
        parts.push(items.map((item) => `- ${item}`).join("\n"));
      }
      continue;
    }
    if (type === "image") {
      const imageUrl = `${block.url || ""}`.trim();
      if (!imageUrl) continue;
      const alt = trimToLength(`${block.alt || "Section visual"}`, 140);
      parts.push(`![${alt}](${imageUrl})`);
    }
  }

  return parts.join("\n\n").trim();
}

function buildShortDescription(source: string, fallback: string): string {
  const candidate = trimToLength(`${source || ""}`.replace(/\s+/g, " ").trim(), 120);
  if (candidate) return candidate;
  return trimToLength(`${fallback || ""}`.replace(/\s+/g, " ").trim(), 120);
}

async function enqueueIndexingJobs(
  supabase: any,
  paths: string[],
  siteUrl: string,
): Promise<{ enqueued: number; warning?: string }> {
  if (!paths.length) return { enqueued: 0 };

  const uniquePaths = [...new Set(paths.map((path) => canonicalizePath(path)).filter(Boolean))];
  const { data: activeRows, error: activeError } = await supabase
    .from("indexing_queue")
    .select("page_path")
    .in("status", ["pending", "processing"])
    .in("page_path", uniquePaths);

  if (activeError) {
    return { enqueued: 0, warning: `indexing_queue_read_failed:${activeError.message}` };
  }

  const activeSet = new Set((activeRows || []).map((row: any) => `${row.page_path || ""}`));
  const rowsToInsert = uniquePaths
    .filter((path) => !activeSet.has(path))
    .map((path) => ({
      page_path: path,
      page_url: `${siteUrl}${path}`,
      source: "auto-seo",
      status: "pending",
    }));

  if (!rowsToInsert.length) return { enqueued: 0 };

  const { error: insertError, data } = await supabase.from("indexing_queue").insert(rowsToInsert).select("id");

  if (insertError) {
    return { enqueued: 0, warning: `indexing_queue_insert_failed:${insertError.message}` };
  }

  return { enqueued: (data || []).length };
}

async function processIndexingQueue(
  supabase: any,
  supabaseUrl: string,
  serviceRoleKey: string,
  limit: number,
): Promise<{ processed: number; indexed: number; failed: number; warning?: string }> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { processed: 0, indexed: 0, failed: 0, warning: "missing_supabase_service_credentials_for_indexing" };
  }

  const { data: queueRows, error: readError } = await supabase
    .from("indexing_queue")
    .select("id,page_path,attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (readError) return { processed: 0, indexed: 0, failed: 0, warning: `indexing_queue_read_failed:${readError.message}` };
  if (!queueRows || queueRows.length === 0) return { processed: 0, indexed: 0, failed: 0 };

  try {
    await fetch(`${supabaseUrl}/functions/v1/sitemap`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });
  } catch {
    // Non-fatal.
  }

  let processed = 0;
  let indexed = 0;
  let failed = 0;

  for (const job of queueRows) {
    await supabase
      .from("indexing_queue")
      .update({ status: "processing", attempts: Number(job.attempts || 0) + 1 })
      .eq("id", job.id);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/index-content`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: "seo_settings",
          page_path: job.page_path,
          path: job.page_path,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        await supabase
          .from("indexing_queue")
          .update({ status: "failed", last_error: `${res.status} ${errText}`.slice(0, 1000) })
          .eq("id", job.id);
        failed += 1;
      } else {
        await supabase
          .from("indexing_queue")
          .update({ status: "indexed", last_error: null, processed_at: new Date().toISOString() })
          .eq("id", job.id);
        indexed += 1;
      }
    } catch (err: any) {
      await supabase
        .from("indexing_queue")
        .update({ status: "failed", last_error: `${err?.message || "unknown_error"}`.slice(0, 1000) })
        .eq("id", job.id);
      failed += 1;
    }
    processed += 1;
  }

  return { processed, indexed, failed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createServiceClient();
    const body = await req.json().catch(() => ({}));

    const levelRaw = `${body.level || "master"}`.toLowerCase();
    const level: SeoLevel =
      levelRaw === "basic" || levelRaw === "intermediate" || levelRaw === "advanced" || levelRaw === "master"
        ? (levelRaw as SeoLevel)
        : "master";

    const singlePageRaw = `${body.single_page || ""}`.trim();
    const singlePage = singlePageRaw ? canonicalizePath(singlePageRaw) : "";
    const enrichContent = body.enrich_content === true;
    const changedOnly = body.changed_only !== false;
    const optimizeWeakFirst = body.optimize_weak_first !== false;
    const triggerIndexing = body.trigger_indexing !== false;
    const maxPages = Math.min(Math.max(Number(body.max_pages || 400), 1), 1200);
    const maxIndexingPerRun = Math.min(Math.max(Number(body.max_indexing_per_run || 25), 1), 100);

    const nowIso = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      settingsRes,
      pageContentRes,
      programRes,
      blogRes,
      faqRes,
      blogMetricsRes,
      allSeoRes,
    ] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("page_content").select("page_slug,page_title,hero_subtitle,content,updated_at,is_active"),
      supabase
        .from("programs")
        .select("id,slug,title,short_description,description,image_url,duration,level,price,updated_at")
        .eq("is_active", true),
      supabase
        .from("blogs")
        .select("id,slug,title,excerpt,content,author,image_url,created_at,updated_at")
        .eq("is_published", true),
      supabase.from("faqs").select("question,answer,category").eq("is_active", true),
      supabase
        .from("blog_performance_metrics")
        .select("blog_id,impressions,clicks,avg_position,metric_date")
        .gte("metric_date", thirtyDaysAgo),
      supabase.from("seo_settings").select("page_path,title,description,internal_links"),
    ]);

    if (settingsRes.error) throw settingsRes.error;
    if (pageContentRes.error) throw pageContentRes.error;
    if (programRes.error) throw programRes.error;
    if (blogRes.error) throw blogRes.error;
    if (faqRes.error) throw faqRes.error;
    if (blogMetricsRes.error) throw blogMetricsRes.error;
    if (allSeoRes.error) throw allSeoRes.error;

    const settings = toSettingsMap(settingsRes.data);
    const siteUrl =
      normalizeBaseUrl(
        readSettingString(settings, ["site_url", "site_base_url", "website_url", "domain_url"]) ||
          Deno.env.get("SITE_URL") ||
          "",
      ) || "https://cloudstrail.com";

    const pageContentMap = new Map<string, any>();
    for (const row of pageContentRes.data || []) {
      if (row.is_active === false) continue;
      pageContentMap.set(`${row.page_slug || ""}`, row);
    }
    const homePageContent = pageContentMap.get("home")?.content;

    const staticPages: PageCandidate[] = [
      { path: "/", name: "Home - IT Training Institute", page_type: "home", sub_sections: ["Hero", "Stats", "Programs", "FAQ", "Blogs", "CTA"] },
      { path: "/about", name: "About Us", page_type: "about", sub_sections: ["Mission", "Vision", "Why Choose Us", "Achievements"] },
      { path: "/programs", name: "All Programs & Courses", page_type: "program_list", sub_sections: ["Programs Grid"] },
      { path: "/blog", name: "Tech Blog", page_type: "blog_list", sub_sections: ["Blog Listing"] },
      { path: "/contact", name: "Contact Us", page_type: "contact", sub_sections: ["Contact Form", "Map", "Info"] },
      { path: "/enroll", name: "Enroll Now", page_type: "enroll", sub_sections: ["Enrollment Form", "Payment", "Batch Selection"] },
      { path: "/privacy", name: "Privacy Policy", page_type: "legal" },
      { path: "/terms", name: "Terms & Conditions", page_type: "legal" },
      { path: "/refund", name: "Refund Policy", page_type: "legal" },
    ];

    for (const page of staticPages) {
      const pageSlug = stripSlash(page.path);
      const contentRow = pageContentMap.get(pageSlug);
      if (contentRow) {
        page.content = `${contentRow.hero_subtitle || ""} ${toShortContext(contentRow.content, 1200)}`.trim();
        page.updated_at = toIsoDate(contentRow.updated_at || "") || undefined;
        page.meta = {
          page_title: contentRow.page_title,
          hero_subtitle: contentRow.hero_subtitle,
        };
      }
    }

    const programs = programRes.data || [];
    const blogs = blogRes.data || [];
    const programById = new Map(programs.map((program: any) => [`${program.id}`, program]));
    const blogById = new Map(blogs.map((blog: any) => [`${blog.id}`, blog]));
    const blogPerformanceByPath = buildPerformanceMap(blogs.map((b: any) => ({ id: b.id, slug: b.slug })), blogMetricsRes.data as any);

    const programPages: PageCandidate[] = programs.map((program: any) => ({
      path: canonicalizePath(`/course/${program.slug}`),
      name: `${program.title}`,
      page_type: "program_detail",
      content: `${program.short_description || ""} ${program.description || ""}`.slice(0, 2200),
      sub_sections: ["Overview", "Curriculum", "Modules", "Enrollment", "FAQ"],
      source_id: `${program.id}`,
      updated_at: toIsoDate(program.updated_at || "") || undefined,
      meta: {
        duration: program.duration,
        level: program.level,
        price: program.price,
      },
    }));

    const blogPages: PageCandidate[] = blogs.map((blog: any) => ({
      path: canonicalizePath(`/blog/${blog.slug}`),
      name: `${blog.title}`,
      page_type: "blog_post",
      content: `${blog.excerpt || ""} ${(blog.content || "").slice(0, 2000)}`,
      source_id: `${blog.id}`,
      updated_at: toIsoDate(blog.updated_at || "") || undefined,
      performance: blogPerformanceByPath.get(`/blog/${blog.slug}`),
      meta: {
        excerpt: blog.excerpt || "",
        author: blog.author || "Clouds Trail",
        image_url: blog.image_url || "",
        created_at: blog.created_at || "",
      },
    }));

    const allPagesMap = new Map<string, PageCandidate>();
    for (const page of [...staticPages, ...programPages, ...blogPages]) allPagesMap.set(page.path, page);
    const allPages = [...allPagesMap.values()].slice(0, maxPages);
    const allPathsSet = new Set(allPages.map((page) => page.path));

    let targetPages = singlePage ? allPages.filter((page) => page.path === singlePage) : allPages;
    if (!targetPages.length) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          processed_count: 0,
          skipped_unchanged: 0,
          enriched_count: 0,
          enriched_paths_count: 0,
          warnings: singlePage ? [`single_page_not_found:${singlePage}`] : [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await attachSourceHashes(targetPages);
    const targetPaths = targetPages.map((page) => page.path);
    const existingRows = await fetchExistingSeoRows(supabase, targetPaths);
    const existingByPath = new Map(existingRows.map((row) => [canonicalizePath(row.page_path || ""), row]));

    const warnings: string[] = [];
    const pagesToProcess: PageCandidate[] = [];
    let skippedUnchanged = 0;

    for (const page of targetPages) {
      const existing = existingByPath.get(page.path);
      const isChanged = !existing || !existing.source_hash || existing.source_hash !== page.source_hash;
      const staleWeakPage = !!page.performance?.weak && isOlderThanDays(existing?.updated_at, 7);
      if (!changedOnly || isChanged || staleWeakPage) {
        pagesToProcess.push(page);
      } else {
        skippedUnchanged += 1;
      }
    }

    if (optimizeWeakFirst) {
      pagesToProcess.sort((a, b) => (b.performance?.weak_score || 0) - (a.performance?.weak_score || 0));
    }

    if (!pagesToProcess.length && !enrichContent) {
      const technicalAudit = await runTechnicalSeoAudit(
        siteUrl,
        homePageContent,
        ((allSeoRes.data || []) as Array<{ page_path: string; internal_links?: unknown }>).map((row) => ({
          page_path: canonicalizePath(`${row.page_path || ""}`, ""),
          internal_links: row.internal_links || [],
        })),
      );
      const technicalAuditPayload = {
        generated_at: nowIso,
        site_url: siteUrl,
        ...technicalAudit,
      };
      const { error: technicalAuditSaveError } = await supabase
        .from("site_settings")
        .upsert({ key: "seo_last_technical_audit", value: technicalAuditPayload }, { onConflict: "key" });
      if (technicalAuditSaveError) warnings.push(`technical_audit_store_failed:${technicalAuditSaveError.message}`);
      if (technicalAudit.summary.fail > 0) warnings.push(`technical_audit_failures:${technicalAudit.summary.fail}`);
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          processed_count: 0,
          skipped_unchanged: skippedUnchanged,
          enriched_count: 0,
          enriched_paths_count: 0,
          level,
          changed_only: changedOnly,
          weak_pages_prioritized: optimizeWeakFirst,
          technical_audit: technicalAuditPayload,
          warnings,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generatedByPath = new Map<string, any>();
    const pageChunks = chunkArray(pagesToProcess, 8);

    for (const chunk of pageChunks) {
      const prompt = buildSeoPromptChunk(chunk, level);
      let generatedChunk: any[] = [];
      try {
        const raw = await callGroqJson(GROQ_API_KEY, SEO_SYSTEM_PROMPT, prompt, 3800, 0.35, "array");
        generatedChunk = Array.isArray(raw) ? raw : [raw];
      } catch (err: any) {
        warnings.push(`seo_chunk_fallback:${err?.message || "unknown_error"}`);
        generatedChunk = buildFallbackSeoEntries(chunk);
      }

      const aiByPath = new Map<string, any>();
      for (const item of generatedChunk) {
        const path = canonicalizePath(`${item?.page_path || item?.canonical_url || ""}`, "");
        if (path) aiByPath.set(path, item);
      }

      for (const page of chunk) {
        generatedByPath.set(page.path, aiByPath.get(page.path) || buildFallbackSeoEntries([page])[0]);
      }
    }

    const allExistingSeoRows = (allSeoRes.data || []) as Array<{
      page_path: string;
      title: string | null;
      description: string | null;
      internal_links?: unknown;
    }>;
    const processPathSet = new Set(pagesToProcess.map((page) => page.path));
    const usedTitles = new Set(
      allExistingSeoRows
        .filter((row) => !processPathSet.has(canonicalizePath(row.page_path || "", "")))
        .map((row) => `${row.title || ""}`.trim().toLowerCase())
        .filter(Boolean),
    );
    const usedDescriptions = new Set(
      allExistingSeoRows
        .filter((row) => !processPathSet.has(canonicalizePath(row.page_path || "", "")))
        .map((row) => `${row.description || ""}`.trim().toLowerCase())
        .filter(Boolean),
    );

    const changedPaths: string[] = [];
    let upsertedCount = 0;
    let qualityTotal = 0;
    const qualityByPath: Array<{ page_path: string; score: number; issues: string[] }> = [];
    const faqRows = (faqRes.data || []) as Array<{ question: string; answer: string; category?: string }>;
    const auditInternalLinksByPath = new Map<string, unknown>();
    for (const row of allExistingSeoRows) {
      const path = canonicalizePath(`${row.page_path || ""}`, "");
      if (!path) continue;
      auditInternalLinksByPath.set(path, row.internal_links || []);
    }

    for (const page of pagesToProcess) {
      const fallback = buildFallbackSeoEntries([page])[0];
      const generated = generatedByPath.get(page.path) || fallback;
      const existing = existingByPath.get(page.path);

      const fallbackKeywords = sanitizeKeywordList(fallback.keywords, ["Clouds Trail", "IT courses India"]);
      const focusKeyword = trimToLength(`${generated.focus_keyword || fallback.focus_keyword || fallbackKeywords[0]}`, 90);
      const secondaryKeywords = sanitizeKeywordList(generated.secondary_keywords, fallbackKeywords.slice(0, 5)).slice(0, 6);

      let keywords = sanitizeKeywordList(generated.keywords, fallbackKeywords);
      if (keywords.length < 8) keywords = sanitizeKeywordList([...keywords, ...fallbackKeywords], fallbackKeywords);
      keywords = keywords.slice(0, 15);

      const canonicalPath = canonicalizePath(`${generated.canonical_url || generated.page_path || page.path}`, page.path);
      const indexingEnabled = generated.indexing_enabled !== false;
      const robotsDirective = normalizeRobotsDirective(generated.robots_directive, indexingEnabled);

      const titleFallback = trimToLength(`${fallback.title || page.name} | Clouds Trail`, 60);
      const titleRaw = trimToLength(`${generated.title || titleFallback}`, 60);
      const title = ensureUniqueText(titleRaw, usedTitles, titleFallback, 60, page.name.split(" ").slice(0, 2).join(" "));

      const descriptionFallback = trimToLength(
        `${fallback.description || `Explore ${page.name} at Clouds Trail with practical IT training in India.`}`,
        155,
      );
      const descriptionRaw = trimToLength(`${generated.description || descriptionFallback}`, 155);
      const description = ensureUniqueText(descriptionRaw, usedDescriptions, descriptionFallback, 155, "Clouds Trail");

      const normalizedExistingInternal = normalizeInternalLinks(generated.internal_links, page.path, allPathsSet);
      const intelligentLinks = buildIntelligentInternalLinks(page, allPages, normalizedExistingInternal);
      auditInternalLinksByPath.set(page.path, intelligentLinks);
      const headingSuggestions = sanitizeHeadingSuggestions(generated.heading_suggestions, title);
      const altTexts = sanitizeAltTexts(generated.alt_texts, page, focusKeyword);
      const faqForPage = pickFaqsForPage(page, faqRows);
      const schemaMarkup = buildSchemaMarkup(page, siteUrl, faqForPage);

      const upsertData: Record<string, unknown> = {
        page_path: page.path,
        title,
        description,
        keywords,
        canonical_url: canonicalPath,
        focus_keyword: focusKeyword,
        secondary_keywords: secondaryKeywords,
        schema_markup: schemaMarkup,
        alt_texts: altTexts,
        internal_links: intelligentLinks,
        heading_suggestions: headingSuggestions,
        robots_directive: robotsDirective,
        indexing_enabled: indexingEnabled,
        source_hash: page.source_hash,
        auto_generated: true,
      };

      const quality = evaluateQuality(upsertData, page);
      qualityTotal += quality.score;
      qualityByPath.push({ page_path: page.path, score: quality.score, issues: quality.issues });
      if (quality.issues.length) warnings.push(`quality:${page.path}:${quality.issues.join("|")}`);

      const changed = hasSeoChanged(existing, upsertData, page.source_hash || "");
      const { error: upsertError } = await supabase.from("seo_settings").upsert(upsertData, { onConflict: "page_path" });
      if (upsertError) {
        warnings.push(`seo_upsert_failed:${page.path}:${upsertError.message}`);
        continue;
      }

      upsertedCount += 1;
      if (changed && indexingEnabled) changedPaths.push(page.path);
    }

    let enrichedCount = 0;
    const enrichedPaths: string[] = [];
    if (enrichContent) {
      const enrichTargets = targetPages.filter(shouldEnrichPage);
      for (const page of enrichTargets) {
        const pageSlug = stripSlash(page.path);
        const sourceId = `${page.source_id || ""}`.trim();
        const existingProgram = page.page_type === "program_detail" && sourceId ? programById.get(sourceId) : null;
        const existingBlog = page.page_type === "blog_post" && sourceId ? blogById.get(sourceId) : null;
        let existingPage: any = null;

        if ((page.page_type === "program_detail" || page.page_type === "blog_post") && !sourceId) {
          warnings.push(`content_enrich_skipped:${page.path}:missing_source_id`);
          continue;
        }

        if (!existingProgram && !existingBlog) {
          const pageRow = await supabase
            .from("page_content")
            .select("id,page_title,hero_subtitle,hero_image_url,content,is_active")
            .eq("page_slug", pageSlug)
            .maybeSingle();
          existingPage = pageRow.data;
        }

        const existingContentSummary = existingProgram
          ? `${existingProgram.short_description || ""} ${existingProgram.description || ""}`
          : existingBlog
            ? `${existingBlog.excerpt || ""} ${existingBlog.content || ""}`
            : toShortContext(existingPage?.content || page.content);

        const enrichPrompt = `Enrich website content for this page.

Page path: ${page.path}
Page slug: ${pageSlug}
Page name: ${page.name}
Section hints: ${(page.sub_sections || []).join(", ")}
Existing content summary: ${toShortContext(existingContentSummary, 1200)}

Return one JSON object with EXACT keys:
{
  "page_slug": "${pageSlug}",
  "page_title": "string",
  "hero_subtitle": "string",
  "hero_image_prompt": "high-end 3d prompt, no text",
  "content": [
    {"type":"heading","text":"..."},
    {"type":"subheading","text":"..."},
    {"type":"paragraph","text":"..."},
    {"type":"list","items":["...","..."]},
    {"type":"image","alt":"...", "image_prompt":"high-end 3d prompt, no text"}
  ]
}

Rules:
- 16-24 content blocks total.
- Target total body content around 1200-1800 words.
- Include at least 3 headings, 5 subheadings, 8 paragraphs, 2 list blocks, and 3 image blocks.
- Avoid using double quote characters inside text values; use apostrophes instead.
- English only.
- Practical, high-value, non-generic copy.
- Return only valid JSON object.`;

        let enriched: any = null;
        try {
          const enrichedRaw = await callGroqJson(GROQ_API_KEY, ENRICH_SYSTEM_PROMPT, enrichPrompt, 3200, 0.45, "object");
          enriched = Array.isArray(enrichedRaw) ? enrichedRaw[0] : enrichedRaw;
        } catch (err: any) {
          warnings.push(`content_enrich_skipped:${page.path}:${err?.message || "unknown_error"}`);
          continue;
        }

        if (!enriched || !Array.isArray(enriched.content)) {
          warnings.push(`content_enrich_skipped:${page.path}:invalid_enriched_content`);
          continue;
        }

        const heroPrompt = buildHighEnd3DPrompt(
          enriched.hero_image_prompt || `High-end 3D hero image for ${enriched.page_title || page.name}`,
          `Page: ${enriched.page_title || page.name}. Slug: ${pageSlug}.`,
        );
        let heroImageUrl = `${existingProgram?.image_url || existingBlog?.image_url || existingPage?.hero_image_url || ""}`.trim();
        try {
          heroImageUrl = await generateViaGenerateImageFunction(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            prompt: heroPrompt,
            width: 1600,
            height: 900,
            model: "flux",
            provider: "pollinations",
            upload_to_cloudinary: true,
            best_of: 1,
            title: enriched.page_title || page.name,
            short_description: enriched.hero_subtitle || "",
            description: `SEO page hero image for ${enriched.page_title || page.name}`,
            category: "SEO",
            keywords: [`${pageSlug}`, `${page.name}`, "Clouds Trail"],
            section_title: "hero image",
            audience: "Indian IT learners and job seekers",
          });
        } catch (err: any) {
          warnings.push(`hero_image_failed:${page.path}:${err?.message || "unknown_error"}`);
        }

        const cleanBlocks: Array<Record<string, unknown>> = [];
        for (const block of enriched.content as EnrichedBlock[]) {
          if (!block || typeof block !== "object") continue;
          if (block.type === "heading" || block.type === "subheading" || block.type === "paragraph") {
            const text = trimToLength(`${block.text || ""}`, 1200);
            if (!text) continue;
            cleanBlocks.push({ type: block.type, text });
            continue;
          }
          if (block.type === "list") {
            const items = Array.isArray(block.items)
              ? block.items.map((item) => trimToLength(`${item || ""}`, 220)).filter(Boolean).slice(0, 12)
              : [];
            if (items.length) cleanBlocks.push({ type: "list", items });
            continue;
          }
          if (block.type === "image") {
            const imgPrompt = buildHighEnd3DPrompt(
              block.image_prompt || block.alt || `High-end 3D visual for ${enriched.page_title || page.name}`,
              `Page: ${enriched.page_title || page.name}. Image alt: ${block.alt || "Section visual"}.`,
            );
            let imageUrl = "";
            try {
              imageUrl = await generateViaGenerateImageFunction(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                prompt: imgPrompt,
                width: 1200,
                height: 675,
                model: "flux",
                provider: "pollinations",
                upload_to_cloudinary: true,
                best_of: 1,
                title: enriched.page_title || page.name,
                short_description: block.alt || "",
                description: block.image_prompt || block.alt || `SEO section image for ${enriched.page_title || page.name}`,
                category: "SEO",
                keywords: [`${pageSlug}`, `${page.name}`],
                section_title: block.alt || "content image",
                audience: "Indian IT learners and job seekers",
              });
            } catch (err: any) {
              warnings.push(`content_image_failed:${page.path}:${err?.message || "unknown_error"}`);
              continue;
            }
            cleanBlocks.push({
              type: "image",
              url: imageUrl,
              alt: trimToLength(`${block.alt || `${enriched.page_title || page.name} section visual`}`, 140),
            });
          }
        }

        if (page.page_type === "program_detail" && existingProgram) {
          const plainText = blocksToPlainText(cleanBlocks, 3500);
          const finalDescription = plainText || trimToLength(`${existingProgram.description || ""}`, 3500);
          const finalShortDescription = buildShortDescription(
            `${enriched.hero_subtitle || ""}`,
            finalDescription || `${existingProgram.short_description || existingProgram.title || ""}`,
          );
          const { error: programUpdateError } = await supabase
            .from("programs")
            .update({
              description: finalDescription || null,
              short_description: finalShortDescription || null,
              image_url: heroImageUrl || existingProgram.image_url || null,
            })
            .eq("id", sourceId);

          if (programUpdateError) {
            warnings.push(`content_upsert_failed:${page.path}:${programUpdateError.message}`);
            continue;
          }

          enrichedCount += 1;
          enrichedPaths.push(page.path);
          continue;
        }

        if (page.page_type === "blog_post" && existingBlog) {
          const markdownContent = blocksToMarkdown(cleanBlocks);
          const excerptFromBlocks = blocksToPlainText(cleanBlocks, 220);
          const finalExcerpt = buildShortDescription(excerptFromBlocks, `${existingBlog.excerpt || ""}`);
          const blogUpdatePayload: Record<string, unknown> = {
            excerpt: finalExcerpt || null,
            image_url: heroImageUrl || existingBlog.image_url || null,
          };
          if (markdownContent) {
            blogUpdatePayload.content = markdownContent;
          }
          const { error: blogUpdateError } = await supabase
            .from("blogs")
            .update(blogUpdatePayload)
            .eq("id", sourceId);

          if (blogUpdateError) {
            warnings.push(`content_upsert_failed:${page.path}:${blogUpdateError.message}`);
            continue;
          }

          enrichedCount += 1;
          enrichedPaths.push(page.path);
          continue;
        }

        const staticContent =
          cleanBlocks.length > 0
            ? cleanBlocks
            : (Array.isArray(existingPage?.content) ? existingPage.content : []);

        const { error: contentUpsertError } = await supabase.from("page_content").upsert(
          {
            id: existingPage?.id,
            page_slug: pageSlug,
            page_title: trimToLength(`${enriched.page_title || existingPage?.page_title || page.name}`, 140),
            hero_subtitle: trimToLength(`${enriched.hero_subtitle || existingPage?.hero_subtitle || ""}`, 220),
            hero_image_url: heroImageUrl || existingPage?.hero_image_url || null,
            content: staticContent,
            is_active: existingPage?.is_active ?? true,
          },
          { onConflict: "page_slug" },
        );

        if (contentUpsertError) {
          warnings.push(`content_upsert_failed:${page.path}:${contentUpsertError.message}`);
          continue;
        }

        enrichedCount += 1;
        enrichedPaths.push(page.path);
      }
    }

    let queueEnqueued = 0;
    let queueProcessed = 0;
    let queueIndexed = 0;
    let queueFailed = 0;

    const indexingPaths = [...new Set([...changedPaths, ...enrichedPaths])];
    if (triggerIndexing && indexingPaths.length > 0) {
      const queueResult = await enqueueIndexingJobs(supabase, indexingPaths, siteUrl);
      queueEnqueued = queueResult.enqueued;
      if (queueResult.warning) warnings.push(queueResult.warning);

      const processResult = await processIndexingQueue(
        supabase,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        maxIndexingPerRun,
      );
      queueProcessed = processResult.processed;
      queueIndexed = processResult.indexed;
      queueFailed = processResult.failed;
      if (processResult.warning) warnings.push(processResult.warning);
    }

    const technicalAudit = await runTechnicalSeoAudit(
      siteUrl,
      homePageContent,
      [...auditInternalLinksByPath.entries()].map(([page_path, internal_links]) => ({ page_path, internal_links })),
    );
    const technicalAuditPayload = {
      generated_at: nowIso,
      site_url: siteUrl,
      ...technicalAudit,
    };
    const { error: technicalAuditSaveError } = await supabase
      .from("site_settings")
      .upsert({ key: "seo_last_technical_audit", value: technicalAuditPayload }, { onConflict: "key" });
    if (technicalAuditSaveError) warnings.push(`technical_audit_store_failed:${technicalAuditSaveError.message}`);
    const technicalFailures = technicalAudit.summary.fail;
    if (technicalFailures > 0) warnings.push(`technical_audit_failures:${technicalFailures}`);

    const avgQualityScore = qualityByPath.length
      ? Number((qualityTotal / qualityByPath.length).toFixed(2))
      : 0;

    return new Response(
      JSON.stringify({
        success: true,
        level,
        changed_only: changedOnly,
        weak_pages_prioritized: optimizeWeakFirst,
        generated_at: nowIso,
        count: upsertedCount,
        processed_count: pagesToProcess.length,
        skipped_unchanged: skippedUnchanged,
        changed_paths_count: changedPaths.length,
        enriched_count: enrichedCount,
        enriched_paths_count: enrichedPaths.length,
        enriched_paths: enrichedPaths,
        quality: {
          avg_score: avgQualityScore,
          pages_scored: qualityByPath.length,
          low_quality_pages: qualityByPath.filter((item) => item.score < 75).slice(0, 20),
        },
        indexing_queue: {
          enqueued: queueEnqueued,
          processed: queueProcessed,
          indexed: queueIndexed,
          failed: queueFailed,
          max_indexing_per_run: maxIndexingPerRun,
        },
        technical_audit: technicalAuditPayload,
        warnings,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error("Auto-SEO error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
