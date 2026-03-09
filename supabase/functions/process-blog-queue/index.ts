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

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
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
    if (expectedSecret && providedSecret === expectedSecret) {
      return { caller: "cron", id: "cron" };
    }
  }

  const adminId = await requireAdmin(req, supabase);
  if (adminId === "public") return { caller: "public", id: "public" };
  return { caller: "admin", id: adminId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let item: any = null;
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const actor = await authorizeCronOrAdmin(req, supabase);
    const callerKey = actor.caller === "cron" ? "cron" : `admin:${actor.id}`;
    await enforceRateLimit(supabase, `process-blog-queue:${callerKey}`, 120, 3600);
    await enforceRateLimit(supabase, `process-blog-queue-ip:${getClientIp(req)}`, 500, 3600);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dayStart = `${today}T00:00:00.000Z`;
    const dayEndDate = new Date(`${today}T00:00:00.000Z`);
    dayEndDate.setUTCDate(dayEndDate.getUTCDate() + 1);
    const dayEnd = dayEndDate.toISOString();

    // Enforce max 1 queue generation per day to keep quality control manageable.
    const { data: alreadyGeneratedToday, error: generationCheckError } = await supabase
      .from("blog_queue")
      .select("id,status,updated_at")
      .in("status", ["generated", "review", "published"])
      .gte("updated_at", dayStart)
      .lt("updated_at", dayEnd)
      .limit(1);

    if (generationCheckError) throw generationCheckError;

    if (alreadyGeneratedToday && alreadyGeneratedToday.length > 0) {
      return new Response(JSON.stringify({ message: "Daily queue generation limit reached for today." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Due queue items: scheduled today or earlier, or no schedule (ASAP).
    const { data: queueItems, error: queueError } = await supabase
      .from("blog_queue")
      .select("*")
      .eq("status", "pending")
      .or(`scheduled_date.lte.${today},scheduled_date.is.null`)
      .order("scheduled_date", { ascending: true, nullsFirst: true })
      .order("queue_type", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No due queue items found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    item = queueItems[0];

    // invoke auto-blog and catch/ log any returned error
    const { data, error } = await supabase.functions.invoke("auto-blog", {
      body: {
        topic: item.topic,
        keywords: item.keywords || [],
        queue_id: item.id,
        publish_now: true,
      },
    });

    if (error) {
      console.error("auto-blog invocation failed for queue item", item.id, error);
      throw error;
    }

    // Safety: ensure queue entry status moves to published with generated blog.
    if (data?.id) {
      await supabase
        .from("blog_queue")
        .update({ status: "published", blog_id: data.id, error_message: null })
        .eq("id", item.id);
    }

    return new Response(JSON.stringify({ success: true, workflow_status: "published", blog: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // log full stack so dashboard logs show more context
    console.error("Process queue error:", e?.message, e?.stack, item);
    try {
      if (item?.id) {
        const supabase = createServiceClient();
        await supabase
          .from("blog_queue")
          .update({ status: "failed", error_message: e.message || "Queue processing failed" })
          .eq("id", item.id);
      }
    } catch (innerErr) {
      console.error("Failed to update queue item status after error", innerErr);
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
