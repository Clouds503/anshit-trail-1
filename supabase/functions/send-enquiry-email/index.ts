import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendGa4Event } from "../_shared/ga4.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

function parseRecipient(recipient: string): string | string[] {
  const values = `${recipient || ""}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (values.length <= 1) return values[0] || "info@cloudstrail.com";
  return values;
}

function parseSettingString(value: unknown): string {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") return parsed.trim();
    } catch {
      return value.replace(/^"|"$/g, "").trim();
    }
    return value.trim();
  }
  if (value == null) return "";
  return String(value).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "Clouds Trail <onboarding@resend.dev>").trim();
    const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") || "info@cloudstrail.com").trim();
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    const supabase = createServiceClient();

    const ip = getClientIp(req);
    const { data: allowed } = await supabase.rpc("enforce_rate_limit", {
      p_key: `send-enquiry-email:${ip}`,
      p_limit: 30,
      p_window_seconds: 3600,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const { name, email, phone, program, message, leadType, downloadUrl, adminEmail, sourcePage } = payload as {
      name?: string;
      email?: string;
      phone?: string;
      program?: string;
      message?: string;
      leadType?: string;
      downloadUrl?: string;
      adminEmail?: string;
      sourcePage?: string;
    };

    let resolvedAdminEmail = (adminEmail || ADMIN_EMAIL).trim();
    if (!resolvedAdminEmail) {
      const { data: adminSetting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_email")
        .maybeSingle();
      if (adminSetting?.value) {
        resolvedAdminEmail = parseSettingString(adminSetting.value);
      }
    }
    if (!resolvedAdminEmail) resolvedAdminEmail = "info@cloudstrail.com";

    const emailStatus = {
      admin: { attempted: true, sent: false, error: "" },
      user: { attempted: false, sent: false, error: "", skipped: true, reason: "disabled_by_configuration" },
    };

    const htmlContent = `
      <h2>New Enquiry Received</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${name || "N/A"}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email || "N/A"}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${phone || "N/A"}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Program</td><td style="padding:8px;border:1px solid #ddd">${program || "N/A"}</td></tr>
        ${message ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>` : ""}
        ${leadType ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Type</td><td style="padding:8px;border:1px solid #ddd">${leadType}</td></tr>` : ""}
        ${sourcePage ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Source Page</td><td style="padding:8px;border:1px solid #ddd">${sourcePage}</td></tr>` : ""}
        ${downloadUrl ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Syllabus URL</td><td style="padding:8px;border:1px solid #ddd"><a href="${downloadUrl}" target="_blank">Open File</a></td></tr>` : ""}
      </table>
    `;

    // Notify admin
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: parseRecipient(resolvedAdminEmail),
        subject: `New Enquiry: ${name || "Unknown"} - ${program || "General"}`,
        html: htmlContent,
      }),
    });

    if (!adminRes.ok) {
      const adminErr = (await adminRes.text()).slice(0, 800);
      emailStatus.admin.error = adminErr;
      console.warn("admin email failed", adminErr);
    } else {
      emailStatus.admin.sent = true;
    }

    const gaResult = await sendGa4Event(
      "lead_submitted",
      {
        lead_type: leadType || "enquiry",
        program: program || "General",
        source_page: sourcePage || "unknown",
        has_message: !!message,
        has_download_url: !!downloadUrl,
      },
      { email, phone },
    );
    if (!gaResult.sent) {
      console.warn("GA4 lead_submitted event not sent:", gaResult);
    }

    if (!emailStatus.admin.sent) {
      return new Response(JSON.stringify({
        error: "Email delivery failed for admin target",
        email: emailStatus,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email: emailStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Email error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
