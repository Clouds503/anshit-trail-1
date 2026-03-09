import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}`.trim();
const supabasePublishableKey = `${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""}`.trim();

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
