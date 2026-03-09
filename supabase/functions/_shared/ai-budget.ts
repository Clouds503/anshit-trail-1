export type CallerIdentity = {
  type: "service" | "user" | "public";
  key: string;
};

export class BudgetError extends Error {
  status: number;
  constructor(message: string, status = 429) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(req: Request): string {
  const raw = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  if (!token || token.split(".").length < 2) return null;
  try {
    const payload = atob(token.split(".")[1] || "");
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

export function resolveCallerIdentity(req: Request): CallerIdentity {
  const token = getBearerToken(req);
  const payload = parseJwtPayload(token);
  const role = `${payload?.role || ""}`.trim().toLowerCase();
  const sub = `${payload?.sub || ""}`.trim();

  if (role === "service_role") {
    return { type: "service", key: "service:service_role" };
  }

  if (role === "authenticated" && sub) {
    return { type: "user", key: `user:${sub}` };
  }

  return { type: "public", key: `ip:${getClientIp(req)}` };
}

export async function enforceRateLimitOrThrow(
  supabase: any,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await supabase.rpc("enforce_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(`Rate limit RPC failed: ${error.message}`);
  }

  if (data === false) {
    throw new BudgetError("Rate limit exceeded. Please retry later.");
  }
}

export async function enforceTokenBudgetOrThrow(
  supabase: any,
  key: string,
  limit: number,
  tokenCost: number,
  windowSeconds: number,
): Promise<void> {
  const cost = Math.max(0, Math.floor(tokenCost));
  if (!cost) return;

  const { data, error } = await supabase.rpc("enforce_token_budget", {
    p_key: key,
    p_limit: limit,
    p_cost: cost,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(`Token budget RPC failed: ${error.message}`);
  }

  if (data === false) {
    throw new BudgetError("Token budget exceeded. Please retry later.");
  }
}
