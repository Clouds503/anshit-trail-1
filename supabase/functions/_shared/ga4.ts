type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

type Ga4Identity = {
  clientId?: string;
  userId?: string;
  email?: string;
  phone?: string;
};

type Ga4Result = {
  sent: boolean;
  status?: number;
  skipped?: string;
  error?: string;
};

const GA4_COLLECT_BASE = "https://www.google-analytics.com/mp/collect";
const GA4_DEBUG_BASE = "https://www.google-analytics.com/debug/mp/collect";
const GA4_MEASUREMENT_ID_FALLBACK = "G-ZKJ801DZNX";
const GA4_API_SECRET_FALLBACK = "Kg6kBlBIT4ylVPVfe-6kPA";

function getEnv(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

function getMeasurementId(): string {
  return getEnv("GA4_MEASUREMENT_ID") || getEnv("GA_MEASUREMENT_ID") || GA4_MEASUREMENT_ID_FALLBACK;
}

function getApiSecret(): string {
  return getEnv("GA4_API_SECRET") || getEnv("GA_API_SECRET") || GA4_API_SECRET_FALLBACK;
}

function isDebugEnabled(): boolean {
  const raw = (getEnv("GA4_MP_DEBUG") || getEnv("GA_MP_DEBUG")).toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function numericClientIdFromHex(hex: string): string {
  const part1 = parseInt(hex.slice(0, 12), 16) || Date.now();
  const part2 = parseInt(hex.slice(12, 24), 16) || Math.floor(Math.random() * 1_000_000_000);
  return `${part1}.${part2}`;
}

function randomClientId(): string {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return `${values[0]}.${values[1]}`;
}

function normalizeIdentitySeed(identity?: Ga4Identity): string {
  const email = `${identity?.email || ""}`.trim().toLowerCase();
  const phone = `${identity?.phone || ""}`.replace(/\D/g, "");
  const userId = `${identity?.userId || ""}`.trim().toLowerCase();
  return email || phone || userId;
}

function cleanPrimitive(value: unknown): Primitive {
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return `${value ?? ""}`.slice(0, 500);
}

function cleanJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
    return cleanPrimitive(value);
  }

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => cleanJsonValue(item))
      .filter((item) => item !== undefined) as JsonValue[];
    return cleanedArray;
  }

  if (typeof value === "object") {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = cleanJsonValue(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }

  return undefined;
}

function sanitizeParams(params: Record<string, unknown>): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(params || {})) {
    const cleaned = cleanJsonValue(value);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

async function resolveIdentity(identity?: Ga4Identity): Promise<{ clientId: string; userId?: string }> {
  if (identity?.clientId?.trim()) {
    return { clientId: identity.clientId.trim(), userId: identity.userId?.trim() || undefined };
  }

  const seed = normalizeIdentitySeed(identity);
  if (seed) {
    const hash = await sha256Hex(seed);
    return {
      clientId: numericClientIdFromHex(hash),
      userId: identity?.userId?.trim() || hash.slice(0, 32),
    };
  }

  return {
    clientId: randomClientId(),
    userId: identity?.userId?.trim() || undefined,
  };
}

export async function sendGa4Event(
  eventName: string,
  params: Record<string, unknown>,
  identity?: Ga4Identity,
): Promise<Ga4Result> {
  const measurementId = getMeasurementId();
  const apiSecret = getApiSecret();

  if (!measurementId || !apiSecret) {
    return { sent: false, skipped: "missing_measurement_id_or_api_secret" };
  }

  const resolvedIdentity = await resolveIdentity(identity);
  const endpointBase = isDebugEnabled() ? GA4_DEBUG_BASE : GA4_COLLECT_BASE;
  const endpoint = `${endpointBase}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const body = {
    client_id: resolvedIdentity.clientId,
    user_id: resolvedIdentity.userId,
    events: [
      {
        name: eventName,
        params: {
          engagement_time_msec: 100,
          ...sanitizeParams(params),
        },
      },
    ],
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        sent: false,
        status: res.status,
        error: (await res.text()).slice(0, 500),
      };
    }

    if (isDebugEnabled()) {
      const debugPayload = await res.text().catch(() => "");
      if (debugPayload) console.log("GA4 debug validation:", debugPayload.slice(0, 1000));
    }

    return { sent: true, status: res.status };
  } catch (error: unknown) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
