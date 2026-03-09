import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CANONICAL_ORIGIN = "https://www.cloudstrail.com";

const PATH_ALIAS_MAP = new Map<string, string>([
  ["/home", "/"],
  ["/about-us", "/about"],
  ["/courses", "/programs"],
  ["/blogs", "/blog"],
  ["/privacy-policy", "/privacy"],
  ["/terms-condition", "/terms"],
  ["/terms-conditions", "/terms"],
  ["/terms-and-conditions", "/terms"],
  ["/terms-of-service", "/terms"],
  ["/refund-policy", "/refund"],
]);

const ROUTE_META_DEFAULTS: Array<{
  matcher: RegExp;
  title: string;
  description: string;
}> = [
  {
    matcher: /^\/$/,
    title: "Salesforce & Workday Training | Clouds Trail IT Institute",
    description:
      "Clouds Trail is a practical salesforce institute and IT institute for Salesforce Admin, Salesforce Developer, Salesforce LWC, Salesforce Omni Studio, and Workday training.",
  },
  {
    matcher: /^\/programs$/,
    title: "Salesforce Admin, Developer & Workday Training Programs",
    description:
      "Explore program tracks for salesforce admin, salesforce developer, sales force foundations, salesforce lwc, salesforce omni studio, and workday training.",
  },
  {
    matcher: /^\/course\/[^/]+$/,
    title: "Program Details | Clouds Trail",
    description:
      "Review program curriculum, outcomes, practical modules, and enrollment details to choose the right career-focused IT training path.",
  },
  {
    matcher: /^\/blog$/,
    title: "Salesforce and Workday Blog | Clouds Trail",
    description:
      "Read practical Clouds Trail guides for Salesforce Admin, Salesforce Developer, Salesforce LWC, Salesforce Omni Studio, and Workday training careers.",
  },
  {
    matcher: /^\/blog\/[^/]+$/,
    title: "Blog Article | Clouds Trail",
    description:
      "Actionable article with practical steps, project-oriented guidance, and interview-aligned insights for IT learners and working professionals.",
  },
  {
    matcher: /^\/about$/,
    title: "About Clouds Trail",
    description:
      "Learn about Clouds Trail, our training approach, learner outcomes, and the mentorship model that drives practical career growth.",
  },
  {
    matcher: /^\/contact$/,
    title: "Contact Clouds Trail",
    description:
      "Connect with Clouds Trail for counseling, admissions support, batch information, and guidance on selecting the right IT learning program.",
  },
  {
    matcher: /^\/enroll$/,
    title: "Enroll Now | Clouds Trail",
    description:
      "Start your enrollment journey with Clouds Trail and access practical IT training paths designed for strong project and career outcomes.",
  },
  {
    matcher: /^\/terms$/,
    title: "Terms and Conditions | Clouds Trail",
    description: "Review the terms and conditions governing access, use, and participation in Clouds Trail services and learning programs.",
  },
  {
    matcher: /^\/privacy$/,
    title: "Privacy Policy | Clouds Trail",
    description: "Read how Clouds Trail collects, uses, and protects personal data across website usage, communication, and service delivery.",
  },
  {
    matcher: /^\/refund$/,
    title: "Refund Policy | Clouds Trail",
    description: "Understand eligibility, timelines, and process details for refunds related to Clouds Trail programs and services.",
  },
];

function normalizePath(rawPathname: string): string {
  let path = `${rawPathname || "/"}`.trim() || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  path = path.length > 1 ? path.replace(/\/+$/, "") : path;

  if (/^\/blogs\/[^/]+$/i.test(path)) {
    return `/blog/${path.split("/")[2] || ""}`.replace(/\/+$/, "");
  }
  if (/^\/courses\/[^/]+$/i.test(path)) {
    return `/course/${path.split("/")[2] || ""}`.replace(/\/+$/, "");
  }

  return PATH_ALIAS_MAP.get(path) || path;
}

function normalizeCanonicalPath(rawPath: unknown, fallbackPath: string): string {
  if (typeof rawPath !== "string") return fallbackPath;
  const trimmed = rawPath.trim();
  if (!trimmed) return fallbackPath;
  try {
    const parsed = /^https?:\/\//i.test(trimmed) ? new URL(trimmed).pathname : trimmed;
    return normalizePath(parsed);
  } catch {
    return fallbackPath;
  }
}

function isValidCanonicalOverride(routePath: string, overridePath: string): boolean {
  return normalizePath(routePath) === normalizePath(overridePath);
}

function ensureMetaTag(attribute: "name" | "property", key: string, content: string): void {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function ensureCanonicalLink(url: string): void {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function resolveFallbackMeta(path: string): { title: string; description: string } {
  for (const item of ROUTE_META_DEFAULTS) {
    if (item.matcher.test(path)) return { title: item.title, description: item.description };
  }
  return {
    title: "Clouds Trail",
    description: "Clouds Trail offers practical, industry-ready IT learning programs with mentorship and placement-focused outcomes.",
  };
}

const RouteSeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = normalizePath(pathname);
    const canonicalFallbackUrl = `${CANONICAL_ORIGIN}${normalizedPath}`;
    const isAdminRoute = normalizedPath.startsWith("/admin");
    const fallback = resolveFallbackMeta(normalizedPath);

    document.title = fallback.title;
    ensureCanonicalLink(canonicalFallbackUrl);
    ensureMetaTag("property", "og:url", canonicalFallbackUrl);
    ensureMetaTag("name", "description", fallback.description);
    ensureMetaTag("name", "robots", isAdminRoute ? "noindex, nofollow, noarchive" : "index, follow");

    if (isAdminRoute) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("seo_settings")
        .select("title,description,canonical_url,indexing_enabled,robots_directive")
        .eq("page_path", normalizedPath)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const overridePath = normalizeCanonicalPath(data.canonical_url, normalizedPath);
      const canonicalPath = isValidCanonicalOverride(normalizedPath, overridePath)
        ? overridePath
        : normalizedPath;
      const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
      const finalTitle = `${data.title || ""}`.trim() || fallback.title;
      const finalDescription = `${data.description || ""}`.trim() || fallback.description;
      const robots =
        data.indexing_enabled === false
          ? "noindex, nofollow"
          : (`${data.robots_directive || ""}`.trim() || "index, follow");

      document.title = finalTitle;
      ensureCanonicalLink(canonicalUrl);
      ensureMetaTag("property", "og:url", canonicalUrl);
      ensureMetaTag("name", "description", finalDescription);
      ensureMetaTag("name", "robots", robots);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
};

export default RouteSeoManager;
