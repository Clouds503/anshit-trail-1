import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type RedirectState = "loading" | "not_found" | "blocked";

const normalizeTargetUrl = (rawTarget: unknown): string | null => {
  const target = `${rawTarget || ""}`.trim();
  if (!target) return null;
  if (/^javascript:/i.test(target)) return null;
  if (/^https?:\/\//i.test(target)) return target;
  if (target.startsWith("/")) return target;
  return `/${target.replace(/^\/+/, "")}`;
};

const ShortLinkRedirect = () => {
  const { slug } = useParams();
  const normalizedSlug = useMemo(() => `${slug || ""}`.trim().toLowerCase(), [slug]);
  const [state, setState] = useState<RedirectState>("loading");

  useEffect(() => {
    let cancelled = false;

    const resolveAndRedirect = async () => {
      if (!normalizedSlug) {
        setState("not_found");
        return;
      }

      const { data, error } = await (supabase as any).rpc("resolve_short_link", { p_slug: normalizedSlug });
      if (cancelled) return;
      if (error) {
        console.error("Failed to resolve short link:", error.message);
        setState("not_found");
        return;
      }

      const targetCandidate = Array.isArray(data) ? data[0]?.target_url : data?.target_url;
      const finalTarget = normalizeTargetUrl(targetCandidate);
      if (!finalTarget) {
        setState(targetCandidate ? "blocked" : "not_found");
        return;
      }

      window.location.replace(finalTarget);
    };

    resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug]);

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        {state === "loading" ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Short URL</p>
            <h1 className="mt-2 text-2xl font-heading font-black text-foreground sm:text-3xl">Redirecting...</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We are opening your destination now.
            </p>
          </>
        ) : state === "blocked" ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-destructive">Blocked</p>
            <h1 className="mt-2 text-2xl font-heading font-black text-foreground sm:text-3xl">Unsafe destination</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              This short URL points to an unsupported destination format.
            </p>
            <Link to="/" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
              Return to Homepage
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Not Found</p>
            <h1 className="mt-2 text-2xl font-heading font-black text-foreground sm:text-3xl">Short URL not available</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              This backlink may be outdated or disabled.
            </p>
            <div className="mt-5 flex justify-center gap-5 text-sm font-semibold">
              <Link to="/" className="text-primary hover:underline">Homepage</Link>
              <Link to="/programs" className="text-primary hover:underline">Programs</Link>
              <Link to="/contact" className="text-primary hover:underline">Contact</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShortLinkRedirect;
