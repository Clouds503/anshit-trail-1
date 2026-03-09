import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createServiceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SitemapEntry = {
  path: string;
  lastmod?: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
};

const STATIC_ROUTES: Array<Omit<SitemapEntry, "lastmod">> = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/programs", changefreq: "daily", priority: 0.9 },
  { path: "/blog", changefreq: "daily", priority: 0.9 },
  { path: "/about", changefreq: "monthly", priority: 0.7 },
  { path: "/contact", changefreq: "monthly", priority: 0.7 },
  { path: "/enroll", changefreq: "weekly", priority: 0.8 },
  { path: "/privacy", changefreq: "monthly", priority: 0.5 },
  { path: "/privacy-policy", changefreq: "monthly", priority: 0.5 },
  { path: "/terms", changefreq: "monthly", priority: 0.5 },
  { path: "/refund", changefreq: "monthly", priority: 0.5 },
];

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
  const trimmed = raw.trim();
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
  if (value === "/home") value = "/";
  if (value.startsWith("/admin")) return null;
  if (value.startsWith("/functions")) return null;
  return value || "/";
}

function toIsoDate(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function isNewer(a?: string, b?: string): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createServiceClient();

    // Public endpoint guard: high but finite rate limit per client IP.
    const { data: allowed } = await supabase.rpc("enforce_rate_limit", {
      p_key: `sitemap:${getClientIp(req)}`,
      p_limit: 360,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [settingsRes, pagesRes, programsRes, blogsRes, seoRes] = await Promise.all([
      supabase.from("site_settings").select("key,value"),
      supabase.from("page_content").select("page_slug,updated_at,is_active"),
      supabase.from("programs").select("slug,updated_at,is_active"),
      supabase.from("blogs").select("slug,updated_at,is_published"),
      supabase.from("seo_settings").select("page_path,canonical_url,indexing_enabled,updated_at"),
    ]);

    if (settingsRes.error) throw settingsRes.error;
    if (pagesRes.error) throw pagesRes.error;
    if (programsRes.error) throw programsRes.error;
    if (blogsRes.error) throw blogsRes.error;
    if (seoRes.error) throw seoRes.error;

    const settings = toSettingsMap(settingsRes.data);
    const configuredSiteUrl = normalizeBaseUrl(
      readSettingString(settings, ["site_url", "site_base_url", "website_url", "domain_url"]) ||
        Deno.env.get("SITE_URL") ||
        "",
    );
    const siteUrl = configuredSiteUrl === "https://www.cloudstrail.com"
      ? configuredSiteUrl
      : "https://www.cloudstrail.com";

    const blockedPaths = new Set<string>();
    const seoRows = seoRes.data || [];
    for (const row of seoRows) {
      if (row.indexing_enabled !== false) continue;
      const blocked = normalizePath(row.page_path || row.canonical_url);
      if (blocked) blockedPaths.add(blocked);
    }

    const map = new Map<string, SitemapEntry>();
    const addEntry = (entry: SitemapEntry) => {
      if (blockedPaths.has(entry.path)) return;
      const existing = map.get(entry.path);
      if (!existing) {
        map.set(entry.path, entry);
        return;
      }
      const latestLastmod = isNewer(entry.lastmod, existing.lastmod) ? entry.lastmod : existing.lastmod;
      map.set(entry.path, {
        ...existing,
        lastmod: latestLastmod,
        priority: Math.max(existing.priority, entry.priority),
        changefreq: existing.changefreq,
      });
    };

    for (const route of STATIC_ROUTES) addEntry({ ...route });

    const activePages = (pagesRes.data || []).filter((row) => row.is_active !== false);
    for (const page of activePages) {
      const path = normalizePath(page.page_slug === "home" ? "/" : `/${page.page_slug}`);
      if (!path) continue;
      addEntry({
        path,
        lastmod: toIsoDate(page.updated_at),
        changefreq: "weekly",
        priority: path === "/" ? 1.0 : 0.8,
      });
    }

    const activePrograms = (programsRes.data || []).filter((row) => row.is_active !== false);
    for (const program of activePrograms) {
      const path = normalizePath(`/course/${program.slug}`);
      if (!path) continue;
      addEntry({
        path,
        lastmod: toIsoDate(program.updated_at),
        changefreq: "weekly",
        priority: 0.8,
      });
    }

    const publishedBlogs = (blogsRes.data || []).filter((row) => row.is_published !== false);
    for (const blog of publishedBlogs) {
      const path = normalizePath(`/blog/${blog.slug}`);
      if (!path) continue;
      addEntry({
        path,
        lastmod: toIsoDate(blog.updated_at),
        changefreq: "weekly",
        priority: 0.7,
      });
    }

    for (const seoRow of seoRows) {
      if (seoRow.indexing_enabled === false) continue;
      const path = normalizePath(seoRow.canonical_url || seoRow.page_path);
      if (!path) continue;
      addEntry({
        path,
        lastmod: toIsoDate(seoRow.updated_at),
        changefreq: "weekly",
        priority: 0.7,
      });
    }

    const entries = Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
    const xmlUrls = entries
      .map((entry) => {
        const location = xmlEscape(`${siteUrl}${entry.path}`);
        return [
          "  <url>",
          `    <loc>${location}</loc>`,
          entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "",
          `    <changefreq>${entry.changefreq}</changefreq>`,
          `    <priority>${entry.priority.toFixed(1)}</priority>`,
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e: any) {
    console.error("sitemap error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
