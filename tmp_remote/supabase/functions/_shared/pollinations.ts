export type PollinationsImageOptions = {
  width?: number;
  height?: number;
  model?: string;
  nologo?: boolean;
  private?: boolean;
  seed?: number;
  apiKey?: string;
};

function normalizePrompt(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .trim()
    .slice(0, 520);
}

function getPollinationsApiKey(): string {
  // This shared module is used only in edge functions where Deno env vars are available.
  return (
    Deno.env.get("POLLINATION_API_KEY") ||
    Deno.env.get("POLLINATIONS_API_KEY") ||
    Deno.env.get("POLLINATION_KEY") ||
    ""
  );
}

export function buildPollinationsImageUrl(prompt: string, options: PollinationsImageOptions = {}): string {
  const {
    width,
    height,
    model = "flux",
    nologo = true,
    private: isPrivate,
    seed,
    apiKey,
  } = options;

  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(normalizePrompt(prompt))}`);

  if (width) url.searchParams.set("width", String(width));
  if (height) url.searchParams.set("height", String(height));
  if (model) url.searchParams.set("model", model);
  if (nologo) url.searchParams.set("nologo", "true");
  if (typeof isPrivate === "boolean") url.searchParams.set("private", String(isPrivate));
  if (typeof seed === "number") url.searchParams.set("seed", String(seed));
  const resolvedKey = apiKey || getPollinationsApiKey();
  if (resolvedKey) url.searchParams.set("key", resolvedKey);

  return url.toString();
}
