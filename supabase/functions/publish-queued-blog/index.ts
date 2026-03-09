import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendGa4Event } from "../_shared/ga4.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createServiceClient();

    const identity = await requireAdminOrService(req, supabase);
    await enforceRateLimit(supabase, `publish-queued-blog:${identity.caller}:${identity.userId}`, 120, 3600);

    const body = await req.json().catch(() => ({}));
    const queueId = `${body?.queue_id || ""}`.trim();
    const directBlogId = `${body?.blog_id || ""}`.trim();

    let publishedBlog: any = null;
    let queueRow: any = null;

    if (queueId) {
      const { data, error } = await supabase
        .from("blog_queue")
        .select("id,topic,status,queue_type,source_blog_id,blog_id")
        .eq("id", queueId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load queue item: ${error.message}`);
      if (!data) throw new HttpError(404, "Queue item not found");
      queueRow = data;
    }

    if (queueRow?.queue_type === "refresh" && queueRow?.source_blog_id && queueRow?.blog_id) {
      const { data: draftBlog, error: draftError } = await supabase
        .from("blogs")
        .select("id,title,content,excerpt,image_url,category,seo_title,seo_description,seo_keywords")
        .eq("id", queueRow.blog_id)
        .maybeSingle();
      if (draftError) throw new Error(`Failed to load refresh draft: ${draftError.message}`);
      if (!draftBlog) throw new HttpError(404, "Refresh draft blog not found");

      const { data: updatedSource, error: sourceUpdateError } = await supabase
        .from("blogs")
        .update({
          title: draftBlog.title,
          content: draftBlog.content,
          excerpt: draftBlog.excerpt,
          image_url: draftBlog.image_url,
          category: draftBlog.category,
          seo_title: draftBlog.seo_title,
          seo_description: draftBlog.seo_description,
          seo_keywords: draftBlog.seo_keywords || [],
          author: "Clouds Trail",
          is_auto_generated: true,
          is_published: true,
        })
        .eq("id", queueRow.source_blog_id)
        .select()
        .single();

      if (sourceUpdateError) throw new Error(`Failed to apply refresh to source blog: ${sourceUpdateError.message}`);

      // Remove temporary refresh draft after merge.
      if (draftBlog.id !== queueRow.source_blog_id) {
        await supabase.from("blogs").delete().eq("id", draftBlog.id);
      }

      await supabase
        .from("blog_queue")
        .update({ status: "published", blog_id: queueRow.source_blog_id, error_message: null })
        .eq("id", queueRow.id);

      publishedBlog = updatedSource;
    } else {
      const targetBlogId = queueRow?.blog_id || directBlogId;
      if (!targetBlogId) throw new HttpError(400, "queue_id or blog_id is required");

      const { data: updated, error: updateError } = await supabase
        .from("blogs")
        .update({ is_published: true, author: "Clouds Trail" })
        .eq("id", targetBlogId)
        .select()
        .single();
      if (updateError) throw new Error(`Failed to publish blog: ${updateError.message}`);
      publishedBlog = updated;

      if (queueRow?.id) {
        await supabase
          .from("blog_queue")
          .update({ status: "published", blog_id: targetBlogId, error_message: null })
          .eq("id", queueRow.id);
      }
    }

    if (publishedBlog) {
      await triggerSitemapAndIndexing(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, publishedBlog);

      const gaResult = await sendGa4Event("blog_published", {
        blog_id: publishedBlog.id,
        slug: publishedBlog.slug || null,
        category: publishedBlog.category || "Blog",
        queue_type: queueRow?.queue_type || "manual",
      });
      if (!gaResult.sent) {
        console.warn("GA4 blog_published event not sent:", gaResult);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      blog: publishedBlog,
      message: "Blog published and indexing triggered.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("publish-queued-blog error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
