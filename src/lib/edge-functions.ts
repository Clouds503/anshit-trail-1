import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = Parameters<typeof supabase.functions.invoke>[1];

type ParsedFunctionError = {
  message: string;
  status?: number;
};

async function parseFunctionError(error: unknown): Promise<ParsedFunctionError> {
  const fallback = error instanceof Error ? error.message : String(error || "Edge function call failed");
  const context = (error as any)?.context;

  if (context instanceof Response) {
    const status = context.status;
    try {
      const raw = await context.clone().text();
      if (!raw) return { message: fallback, status };
      try {
        const parsed = JSON.parse(raw);
        const message = parsed?.error || parsed?.message || raw;
        return { message: String(message), status };
      } catch {
        return { message: raw, status };
      }
    } catch {
      return { message: fallback, status };
    }
  }

  return { message: fallback };
}

function isJwtError(details: ParsedFunctionError): boolean {
  return (
    details.status === 401 ||
    /invalid jwt|expired auth token|invalid auth token|authorization token is required/i.test(details.message)
  );
}

const FALLBACK_PUBLISHABLE_FUNCTIONS = new Set([
  "generate-image",
  "generate-program-content",
  "extract-syllabus",
  "auto-seo",
  "index-content",
  "research-blog-topics",
  "auto-blog",
  "process-blog-queue",
  "publish-queued-blog",
  "refresh-weak-blogs",
]);

async function invokeWithPublishableToken<T = any>(functionName: string, options: InvokeOptions = {}): Promise<T> {
  const supabaseUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}`.trim();
  const publishableKey = `${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""}`.trim();
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase URL or publishable key in frontend environment.");
  }

  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        ...(options?.headers || {}),
      },
      body: options?.body === undefined ? "{}" : JSON.stringify(options.body),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err || "network error");
    throw new Error(`Network error calling ${functionName} at ${endpoint}: ${reason}`);
  }

  const raw = await response.text().catch(() => "");
  const parsed = (() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!response.ok) {
    const message = parsed?.error || parsed?.message || raw || `Function ${functionName} failed with ${response.status}`;
    throw new Error(String(message));
  }

  return (parsed ?? (raw as unknown as T)) as T;
}

async function getFreshAccessToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const existingToken = sessionData.session?.access_token;

  if (existingToken) {
    const { data: userData, error: userError } = await supabase.auth.getUser(existingToken);
    if (!userError && userData?.user?.id) return existingToken;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    await supabase.auth.signOut();
    throw new Error("Session expired. Please login again.");
  }

  return refreshed.session.access_token;
}

export async function invokeAdminFunction<T = any>(functionName: string, options: InvokeOptions = {}): Promise<T> {
  let token = "";
  try {
    token = await getFreshAccessToken();
  } catch (sessionErr) {
    if (FALLBACK_PUBLISHABLE_FUNCTIONS.has(functionName)) {
      return await invokeWithPublishableToken<T>(functionName, options);
    }
    throw sessionErr;
  }
  let { data, error } = await supabase.functions.invoke(functionName, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!error) return data as T;

  let details = await parseFunctionError(error);
  if (isJwtError(details)) {
    try {
      token = await getFreshAccessToken();
    } catch (sessionErr) {
      if (FALLBACK_PUBLISHABLE_FUNCTIONS.has(functionName)) {
        return await invokeWithPublishableToken<T>(functionName, options);
      }
      await supabase.auth.signOut();
      throw new Error("Session expired. Please login again.");
    }
    const retry = await supabase.functions.invoke(functionName, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!retry.error) return retry.data as T;
    details = await parseFunctionError(retry.error);

    if (isJwtError(details)) {
      if (FALLBACK_PUBLISHABLE_FUNCTIONS.has(functionName)) {
        return await invokeWithPublishableToken<T>(functionName, options);
      }
      await supabase.auth.signOut();
      throw new Error("Session expired. Please login again.");
    }
  }

  throw new Error(details.message || "Edge function call failed");
}
