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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const supabase = createServiceClient();
    const ip = getClientIp(req);
    const { data: allowed } = await supabase.rpc("enforce_rate_limit", {
      p_key: `create-razorpay-order:${ip}`,
      p_limit: 25,
      p_window_seconds: 3600,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Razorpay Key ID from site_settings
    const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "razorpay_key_id").maybeSingle();
    let keyId = "";
    if (setting?.value) {
      try {
        const v = setting.value;
        keyId = typeof v === "string" ? v.replace(/^"|"$/g, "") : String(v);
      } catch { keyId = String(setting.value); }
    }
    if (!keyId) throw new Error("Razorpay Key ID not configured in settings");

    const { amount, currency, program, name, email, phone, preferred_batch_time, program_id, next_batch_date } = await req.json();
    if (!amount || !program) throw new Error("amount and program are required");

    // Create Razorpay order
    const auth = btoa(`${keyId}:${RAZORPAY_KEY_SECRET}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: currency || "INR",
        notes: { program, name, email, phone, preferred_batch_time },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Razorpay error: ${orderRes.status} ${errText}`);
    }

    const order = await orderRes.json();

    // Create enrollment record
    const billNumber = `CT-${Date.now().toString(36).toUpperCase()}`;
    const { data: enrollment } = await supabase.from("enrollments").insert({
      name, email, phone,
      program,
      program_id: program_id || null,
      preferred_batch_time: preferred_batch_time || "Flexible",
      next_batch_date: next_batch_date || null,
      razorpay_order_id: order.id,
      payment_status: "pending",
      amount,
      bill_number: billNumber,
    }).select().single();

    const gaResult = await sendGa4Event(
      "begin_checkout",
      {
        currency: order.currency || "INR",
        value: Number(amount) || 0,
        order_id: order.id,
        item_count: 1,
        payment_provider: "razorpay",
        program,
        preferred_batch_time: preferred_batch_time || "Flexible",
        items: [
          {
            item_id: program_id || program,
            item_name: program,
            price: Number(amount) || 0,
            quantity: 1,
          },
        ],
      },
      { email, phone },
    );
    if (!gaResult.sent) {
      console.warn("GA4 begin_checkout event not sent:", gaResult);
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      key_id: keyId,
      amount: order.amount,
      currency: order.currency,
      enrollment_id: enrollment?.id,
      bill_number: billNumber,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Razorpay error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
