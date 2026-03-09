import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// helper that enforces required environment variables and returns
// a service-role client for use inside edge functions.

function getEnv(key: string): string {
  const val = Deno.env.get(key);
  if (!val) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return val;
}

export function createServiceClient() {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

export { getEnv };
