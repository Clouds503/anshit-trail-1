import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAIJson } from "../_shared/parse-ai-json.ts";
import { createServiceClient, getEnv } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROGRAM_SYSTEM_PROMPT = `You are a senior instructional copywriter for premium IT training programs.
Return strictly valid JSON only. No markdown fences.`;

const CLEAN_PROGRAM_FALLBACK_IMAGE_URL =
  "https://res.cloudinary.com/djvf4rg72/image/upload/v1772169180/cqpdvcsiwlcboxg7wcda.jpg";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function buildFallbackProgramData(title: string, descriptionSeed?: string) {
  const seed = (descriptionSeed || "").trim();
  const shortBase = `${title} training for practical, job-ready skills`;

  return {
    short_description: shortBase.slice(0, 100),
    description:
      seed.length > 50
        ? seed
        : `${title} helps learners build practical, job-ready expertise through structured modules, guided implementation, and project-based learning. The curriculum focuses on real workflows, best practices, and interview-relevant outcomes so students can confidently apply skills in production environments.`,
    highlights: [
      "Hands-on practical training",
      "Industry-aligned curriculum",
      "Project-based implementation",
      "Mentor-guided learning path",
      "Interview and career preparation",
      "Real-world workflow exposure",
      "Portfolio-ready outcomes",
      "Job-ready skill development",
    ],
    image_prompt: `Premium cinematic 3D training visual for ${title}, no text overlays`,
  };
}

function normalizeProgramData(data: any, title: string, descriptionSeed?: string) {
  const fallback = buildFallbackProgramData(title, descriptionSeed);
  const safeShort = typeof data?.short_description === "string" && data.short_description.trim()
    ? data.short_description.trim().slice(0, 100)
    : fallback.short_description;

  const safeDesc = typeof data?.description === "string" && data.description.trim()
    ? data.description.trim()
    : fallback.description;

  const safeHighlights = Array.isArray(data?.highlights)
    ? data.highlights.map((h: unknown) => `${h || ""}`.trim()).filter(Boolean).slice(0, 10)
    : [];

  const finalHighlights = safeHighlights.length >= 4 ? safeHighlights : fallback.highlights;
  const safePrompt = typeof data?.image_prompt === "string" && data.image_prompt.trim()
    ? data.image_prompt.trim()
    : fallback.image_prompt;

  return {
    short_description: safeShort,
    description: safeDesc,
    highlights: finalHighlights,
    image_prompt: safePrompt,
  };
}

async function requestGroqProgramContent(apiKey: string, prompt: string): Promise<string | null> {
  const models = ["llama-3.3-70b-versatile"];
  for (const model of models) {
    for (let attempt = 0; attempt < 1; attempt++) {
      let groqRes: Response;
      try {
        groqRes = await withTimeout(
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: PROGRAM_SYSTEM_PROMPT },
                { role: "user", content: prompt },
              ],
              temperature: 0.45,
              max_tokens: 1200,
            }),
          }),
          9000,
        );
      } catch (timeoutErr) {
        console.warn(`Groq timeout model=${model} attempt=${attempt + 1}.`);
        continue;
      }

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        return groqData?.choices?.[0]?.message?.content || null;
      }

      const errText = await groqRes.text().catch(() => "");
      if (groqRes.status === 429 || groqRes.status >= 500) {
        console.warn(`Groq unavailable (${groqRes.status}) model=${model} attempt=${attempt + 1}.`);
        if (attempt < 1) await sleep(700);
        continue;
      }

      throw new Error(`Groq error: ${groqRes.status} ${errText}`);
    }
  }
  return null;
}

async function generateImageFast(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  if (!supabaseUrl || !serviceRoleKey) return null;
  try {
    const res = await withTimeout(
      fetch(`${supabaseUrl}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
      7000,
    );

    if (!res.ok) {
      console.warn("generate-image non-ok status:", res.status);
      return null;
    }

    const body = await res.json().catch(() => null);
    const url = body?.url?.toString?.() || "";
    return url || null;
  } catch (err) {
    console.warn("generate-image fast path failed:", err);
    return null;
  }
}

async function triggerIndexing(
  supabaseUrl: string,
  serviceRoleKey: string,
  id: string,
  slug: string | null,
): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) return;
  try {
    await withTimeout(
      fetch(`${supabaseUrl}/functions/v1/index-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          table: "programs",
          id,
          slug,
        }),
      }),
      5000,
    );
  } catch (e) {
    console.warn("program auto-index call failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const { program_id, title, description_seed } = await req.json().catch(() => ({}));
    if (!program_id || !title) {
      return new Response(JSON.stringify({ error: "program_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createServiceClient();
    const { data: existingProgram } = await supabase
      .from("programs")
      .select("image_url,slug")
      .eq("id", program_id)
      .maybeSingle();

    const prompt = `Generate JSON for IT training program content.

Course title: "${title}"
${description_seed ? `Existing context: ${description_seed}` : ""}

Return exact JSON keys:
{
  "short_description": "string <= 100 chars",
  "description": "220-320 words, professional English",
  "highlights": ["8 concise strings"],
  "image_prompt": "single cinematic 3D prompt"
}

Output JSON only.`;

    let contentData: any = buildFallbackProgramData(title, description_seed);
    let usedFallbackContent = true;
    if (GROQ_API_KEY) {
      const raw = await requestGroqProgramContent(GROQ_API_KEY, prompt);
      if (raw) {
        try {
          contentData = parseAIJson(raw);
          usedFallbackContent = false;
        } catch (parseErr) {
          console.warn("Program content parse failed; using fallback:", parseErr);
        }
      } else {
        console.warn("Groq returned no usable content; using fallback.");
      }
    }

    contentData = normalizeProgramData(contentData, title, description_seed);

    const edgePrompt = [
      `Premium cinematic 3D training card for ${title}.`,
      "Show mentor + learners with abstract technical components.",
      "No text, no logos, no labels, no watermarks.",
    ].join(" ");

    const generatedImage = await generateImageFast(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      prompt: edgePrompt,
      width: 800,
      height: 450,
      upload_to_cloudinary: true,
      best_of: 1,
      title,
      short_description: contentData.short_description || "",
      description: contentData.description || description_seed || "",
      category: "Program",
      keywords: Array.isArray(contentData.highlights) ? contentData.highlights.slice(0, 6) : [],
      section_title: "program card",
      audience: "Indian IT learners and job seekers",
    });

    const existingImageUrl = `${existingProgram?.image_url || ""}`.trim();
    const imageUrl =
      generatedImage ||
      (existingImageUrl.startsWith("http://") || existingImageUrl.startsWith("https://")
        ? existingImageUrl
        : CLEAN_PROGRAM_FALLBACK_IMAGE_URL);

    const { data: updatedProgram, error } = await supabase
      .from("programs")
      .update({
        short_description: contentData.short_description,
        description: contentData.description,
        highlights: contentData.highlights || [],
        image_url: imageUrl,
      })
      .eq("id", program_id)
      .select("id,slug")
      .single();

    if (error) throw new Error(`DB error: ${error.message}`);

    await triggerIndexing(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      updatedProgram?.id || program_id,
      updatedProgram?.slug || existingProgram?.slug || null,
    );

    return new Response(JSON.stringify({
      success: true,
      short_description: contentData.short_description,
      description: contentData.description,
      highlights: contentData.highlights || [],
      image_url: imageUrl,
      used_fallback_content: usedFallbackContent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate program content error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
