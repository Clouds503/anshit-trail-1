import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SiteSettingRow = { key: string; value: unknown };

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

function toSettingsMap(rows: SiteSettingRow[] | null): Record<string, unknown> {
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

function readSettingBoolean(settings: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
  }
  return fallback;
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

function normalizeAbsoluteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
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

function resolvePagePath(body: Record<string, any>): string | null {
  const directPath = normalizePath(body.path || body.page_path || body.route || body.url_path || body.url);
  if (directPath) return directPath;

  const pageSlug = typeof body.page_slug === "string" ? body.page_slug.trim() : "";
  if (pageSlug) return normalizePath(pageSlug === "home" ? "/" : `/${pageSlug}`);

  const tableName = `${body.table || body.table_name || ""}`.toLowerCase().trim();
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) return null;

  if (tableName === "blogs" || body.is_published !== undefined || body.category !== undefined) {
    return normalizePath(`/blog/${slug}`);
  }

  if (
    tableName === "programs" ||
    body.duration !== undefined ||
    body.short_description !== undefined ||
    body.next_batch_date !== undefined
  ) {
    return normalizePath(`/course/${slug}`);
  }

  if (tableName === "page_content") return normalizePath(slug === "home" ? "/" : `/${slug}`);
  return normalizePath(`/${slug}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createServiceClient();

    const body = await req.json().catch(() => ({} as Record<string, any>));

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value");

    const map = toSettingsMap((settings || []) as SiteSettingRow[]);
    const siteUrl =
      normalizeBaseUrl(
        readSettingString(map, ["site_url", "site_base_url", "website_url", "domain_url"]) ||
        Deno.env.get("SITE_URL") ||
        "",
      ) || "https://cloudstrail.com";

    const configuredSitemapPath = readSettingString(map, ["sitemap_url"]);
    const sitemapUrl =
      (configuredSitemapPath.startsWith("/")
        ? `${siteUrl}${configuredSitemapPath}`
        : normalizeAbsoluteUrl(configuredSitemapPath)) ||
      `${getEnv("SUPABASE_URL")}/functions/v1/sitemap`;

    const pagePath = resolvePagePath(body);
    const pageUrl = pagePath ? `${siteUrl}${pagePath}` : "";

    if (pagePath) {
      const { data: pageSeo } = await supabase
        .from("seo_settings")
        .select("indexing_enabled")
        .eq("page_path", pagePath)
        .maybeSingle();

      if (pageSeo?.indexing_enabled === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "indexing_disabled", page_path: pagePath }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const notifications: Record<string, any> = {};

    if (sitemapUrl) {
      try {
        const warmRes = await fetch(sitemapUrl, { method: "GET" });
        notifications.sitemap_refresh = { ok: warmRes.ok, status: warmRes.status };
      } catch (err: any) {
        notifications.sitemap_refresh = { ok: false, error: err.message };
      }
    }

    const indexingApiUrl = normalizeAbsoluteUrl(readSettingString(map, ["indexing_api_url"]));
    if (indexingApiUrl) {
      try {
        const payload = {
          ...body,
          page_path: pagePath,
          page_url: pageUrl || null,
          sitemap_url: sitemapUrl,
          indexed_at: new Date().toISOString(),
        };
        const res = await fetch(indexingApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        notifications.custom_api = {
          ok: res.ok,
          status: res.status,
          response: (await res.text()).slice(0, 500),
        };
      } catch (err: any) {
        notifications.custom_api = { ok: false, error: err.message };
      }
    }

    const bingPingEnabled = readSettingBoolean(map, ["bing_sitemap_ping_enabled"], true);
    if (bingPingEnabled && sitemapUrl) {
      try {
        const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const res = await fetch(pingUrl, { method: "GET" });
        notifications.bing_sitemap_ping = { ok: res.ok, status: res.status };
      } catch (err: any) {
        notifications.bing_sitemap_ping = { ok: false, error: err.message };
      }
    }

    const indexNowEnabled = readSettingBoolean(map, ["indexnow_enabled"], false);
    if (indexNowEnabled && pageUrl) {
      const key = readSettingString(map, ["indexnow_key"]);
      const endpoint =
        normalizeAbsoluteUrl(readSettingString(map, ["indexnow_endpoint"])) || "https://api.indexnow.org/indexnow";
      const host = readSettingString(map, ["indexnow_host"]) || new URL(siteUrl).hostname;
      const rawKeyLocation = readSettingString(map, ["indexnow_key_location"]);
      const keyLocation = rawKeyLocation
        ? rawKeyLocation.startsWith("/")
          ? `${siteUrl}${rawKeyLocation}`
          : normalizeAbsoluteUrl(rawKeyLocation)
        : key
          ? `${siteUrl}/${key}.txt`
          : "";

      if (key && endpoint && host) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
              host,
              key,
              keyLocation,
              urlList: [pageUrl],
            }),
          });
          notifications.indexnow = {
            ok: res.ok,
            status: res.status,
            response: (await res.text()).slice(0, 500),
          };
        } catch (err: any) {
          notifications.indexnow = { ok: false, error: err.message };
        }
      } else {
        notifications.indexnow = { ok: false, skipped: "missing_key_or_host" };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      page_path: pagePath,
      page_url: pageUrl || null,
      sitemap_url: sitemapUrl,
      notifications,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("index-content error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
