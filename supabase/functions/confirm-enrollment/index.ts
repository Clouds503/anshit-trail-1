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
    const supabase = createServiceClient();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") || "").trim();
    const ip = getClientIp(req);

    const { data: allowed } = await supabase.rpc("enforce_rate_limit", {
      p_key: `confirm-enrollment:${ip}`,
      p_limit: 60,
      p_window_seconds: 3600,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { enrollment_id, razorpay_payment_id, razorpay_order_id } = await req.json();
    if (!enrollment_id || !razorpay_payment_id) throw new Error("enrollment_id and razorpay_payment_id required");

    // Update enrollment
    const { data: enrollment, error } = await supabase.from("enrollments")
      .update({ payment_status: "paid", razorpay_payment_id })
      .eq("id", enrollment_id)
      .select()
      .single();

    if (error || !enrollment) throw new Error("Failed to update enrollment");

    // Also save as lead
    await supabase.from("leads").insert({
      name: enrollment.name,
      email: enrollment.email,
      phone: enrollment.phone,
      program: enrollment.program,
      lead_type: "enrollment-paid",
      source_page: "enroll-now",
    });

    const amountPaid = Number(enrollment.amount) || 0;
    const gaResult = await sendGa4Event(
      "purchase",
      {
        transaction_id: enrollment.bill_number || razorpay_payment_id,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id || enrollment.razorpay_order_id || null,
        currency: "INR",
        value: amountPaid,
        tax: 0,
        shipping: 0,
        payment_provider: "razorpay",
        program: enrollment.program,
        preferred_batch_time: enrollment.preferred_batch_time || "Flexible",
        items: [
          {
            item_id: enrollment.program_id || enrollment.program,
            item_name: enrollment.program,
            price: amountPaid,
            quantity: 1,
          },
        ],
      },
      { email: enrollment.email, phone: enrollment.phone },
    );
    if (!gaResult.sent) {
      console.warn("GA4 purchase event not sent:", gaResult);
    }

    // Send confirmation email via Resend
    if (RESEND_API_KEY) {
      const billHtml = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#333">
  <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:24px">🎓 Clouds Trail</h1>
    <p style="color:rgba(255,255,255,0.9);margin:5px 0 0;font-size:14px">Admission Confirmed</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:25px;border-radius:0 0 12px 12px">
    <h2 style="color:#6366f1;margin-top:0">Welcome, ${enrollment.name}! 🎉</h2>
    <p>Your enrollment has been confirmed. Here are your details:</p>
    
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Bill Number</td><td style="padding:10px;border:1px solid #e5e7eb">${enrollment.bill_number}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Program</td><td style="padding:10px;border:1px solid #e5e7eb">${enrollment.program}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Amount Paid</td><td style="padding:10px;border:1px solid #e5e7eb;color:#16a34a;font-weight:bold">₹${Number(enrollment.amount).toLocaleString()}</td></tr>
      <tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Payment ID</td><td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${razorpay_payment_id}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Preferred Batch</td><td style="padding:10px;border:1px solid #e5e7eb">${enrollment.preferred_batch_time}</td></tr>
      ${enrollment.next_batch_date ? `<tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Next Batch Date</td><td style="padding:10px;border:1px solid #e5e7eb">${new Date(enrollment.next_batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>` : ''}
      <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Date</td><td style="padding:10px;border:1px solid #e5e7eb">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin:20px 0">
      <p style="margin:0;color:#16a34a;font-weight:bold">✅ What's Next?</p>
      <ul style="margin:10px 0 0;padding-left:20px;color:#333;font-size:14px">
        <li>Our team will contact you within 24 hours with batch details</li>
        <li>You'll receive access to the learning portal</li>
        <li>Course materials will be shared before batch start</li>
      </ul>
    </div>

    <p style="font-size:13px;color:#6b7280">For any queries, reach us at info@cloudstrail.com or call +91 99999 99999</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="font-size:11px;color:#9ca3af;text-align:center">This is an auto-generated receipt from Clouds Trail. Please save this email for your records.</p>
  </div>
</body></html>`;

      try {
        // Get admin email for notification
        const { data: adminSetting } = await supabase.from("site_settings").select("value").eq("key", "admin_email").maybeSingle();
        let adminEmail = ADMIN_EMAIL;
        if (adminSetting?.value) {
          try {
            adminEmail = typeof adminSetting.value === "string"
              ? adminSetting.value.replace(/^"|"$/g, "").trim()
              : String(adminSetting.value).trim();
          } catch {}
        }

        // Send to student
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Clouds Trail <onboarding@resend.dev>",
            to: [enrollment.email],
            subject: `✅ Enrollment Confirmed - ${enrollment.program} | Bill #${enrollment.bill_number}`,
            html: billHtml,
          }),
        });

        // Notify admin
        if (adminEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Clouds Trail <onboarding@resend.dev>",
              to: [adminEmail],
              subject: `🎓 New Paid Enrollment: ${enrollment.name} - ${enrollment.program}`,
              html: `<p><strong>${enrollment.name}</strong> enrolled in <strong>${enrollment.program}</strong>.</p><p>Amount: ₹${Number(enrollment.amount).toLocaleString()}</p><p>Bill: ${enrollment.bill_number}</p><p>Batch: ${enrollment.preferred_batch_time}</p><p>Phone: ${enrollment.phone}</p><p>Email: ${enrollment.email}</p>`,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, enrollment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Confirm enrollment error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
