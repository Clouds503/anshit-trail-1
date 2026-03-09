import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

function getBearerToken(req: Request): string {
  const raw = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function parseSettingString(value: unknown): string {
  if (typeof value !== "string") return `${value || ""}`.trim();
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "string" ? parsed.trim() : `${parsed || ""}`.trim();
  } catch {
    return trimmed.replace(/^"|"$/g, "").trim();
  }
}

function parseSettingBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = parseSettingString(value).toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
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

async function requireAdmin(req: Request, supabase: any): Promise<string> {
  const token = getBearerToken(req);
  if (!token) return "public";

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) return "public";

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleError || !isAdmin) return "public";

  return userData.user.id;
}

async function authorizeCronOrAdmin(req: Request, supabase: any): Promise<{ caller: "cron" | "admin" | "public"; id: string }> {
  const providedSecret = `${req.headers.get("x-cron-secret") || ""}`.trim();
  if (providedSecret) {
    const { data: secretSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "blog_cron_secret")
      .maybeSingle();
    const expectedSecret = parseSettingString(secretSetting?.value);
    if (expectedSecret && expectedSecret === providedSecret) {
      return { caller: "cron", id: "cron" };
    }
  }

  const adminId = await requireAdmin(req, supabase);
  if (adminId === "public") return { caller: "public", id: "public" };
  return { caller: "admin", id: adminId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createServiceClient();
    const actor = await authorizeCronOrAdmin(req, supabase);
    await enforceRateLimit(supabase, `refresh-weak-blogs:${actor.caller}:${actor.id}`, 48, 86400);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const { data: refreshEnabledSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "blog_refresh_enabled")
      .maybeSingle();

    if (!parseSettingBoolean(refreshEnabledSetting?.value, true)) {
      return new Response(JSON.stringify({ success: true, queued_count: 0, skipped: "blog_refresh_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const minImpressions = toPositiveInt(body?.min_impressions, 150);
    const minCtr = toPositiveNumber(body?.min_ctr, 0.015);
    const maxAvgPosition = toPositiveNumber(body?.max_avg_position, 25);
    const maxItems = toPositiveInt(body?.max_items, 5);

    const { data: queuedCount, error } = await supabase.rpc("queue_weak_blogs_for_refresh", {
      p_min_impressions: minImpressions,
      p_min_ctr: minCtr,
      p_max_avg_position: maxAvgPosition,
      p_max_items: maxItems,
    });
    if (error) throw new Error(`Failed to queue weak blogs: ${error.message}`);

    return new Response(JSON.stringify({
      success: true,
      queued_count: Number(queuedCount || 0),
      thresholds: {
        min_impressions: minImpressions,
        min_ctr: minCtr,
        max_avg_position: maxAvgPosition,
        max_items: maxItems,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("refresh-weak-blogs error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
