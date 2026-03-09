import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const { syllabus_text, program_id } = await req.json();
    if (!syllabus_text || !program_id) throw new Error("syllabus_text and program_id are required");

    const supabase = createServiceClient();

    const prompt = `Extract structured modules from this syllabus/curriculum text. 
Return a JSON array of modules, where each module has:
- title: module/section title
- topics: array of topic strings covered in this module
- duration: estimated duration (e.g., "2 weeks") if mentioned, else null

Syllabus text:
${syllabus_text.slice(0, 3000)}

Return ONLY valid JSON array, no markdown fences.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq error: ${groqRes.status}`);

    const groqData = await groqRes.json();

    let modules;
    try {
      modules = parseAIJson(groqData.choices[0].message.content);
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      throw new Error("Failed to parse modules from AI response");
    }

    const { data: updatedProgram, error } = await supabase
      .from("programs")
      .update({ modules })
      .eq("id", program_id)
      .select("id,slug")
      .single();
    if (error) throw new Error(`DB error: ${error.message}`);

    try {
      const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
      const res = await fetch(`${getEnv("SUPABASE_URL")}/functions/v1/index-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          table: "programs",
          id: updatedProgram?.id || program_id,
          slug: updatedProgram?.slug,
        }),
      });
      if (!res.ok) console.warn("syllabus auto-index call failed", await res.text());
    } catch (e) {
      console.error("syllabus auto-index error", e);
    }

    return new Response(JSON.stringify({ success: true, modules }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Extract syllabus error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
