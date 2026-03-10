import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CANONICAL_ORIGIN = "https://www.cloudstrail.com";
const JSON_LD_SCRIPT_ID = "route-seo-jsonld";
const BUSINESS_PHONE = "+91 92598 98397";
const BUSINESS_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Noida, Uttar Pradesh",
  addressLocality: "Noida",
  addressRegion: "Uttar Pradesh",
  postalCode: "201301",
  addressCountry: "IN",
};

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

const DEFAULT_KEYWORDS = [
  "clouds trail",
  "salesforce training institute",
  "salesforce administration",
  "salesforce programs",
  "cloud career training",
  "placement support",
  "workday training",
];

const ROUTE_META_DEFAULTS: Array<{
  matcher: RegExp;
  title: string;
  description: string;
  keywords: string[];
}> = [
  {
    matcher: /^\/$/,
    title: "Salesforce & Workday Training Institute | Clouds Trail",
    description:
      "Clouds Trail provides Salesforce administration and cloud salesforce programs with practical training, career guidance, and learners currently placed at top companies.",
    keywords: [
      "clouds trail",
      "salesforce administration",
      "cloud salesforce training",
      "salesforce career placement",
      "currently placed at top companies",
      "salesforce programs",
      "salesforce training",
      "job-ready cloud career",
    ],
  },
  {
    matcher: /^\/programs$/,
    title: "Salesforce Admin, Developer & Workday Programs | Clouds Trail",
    description:
      "Explore Salesforce and Workday programs with live classes, guided projects, certification preparation, and placement-oriented training support.",
    keywords: [
      "salesforce programs",
      "salesforce administration training",
      "cloud salesforce",
      "career training programs",
      "placement-focused learning",
    ],
  },
  {
    matcher: /^\/course\/[^/]+$/,
    title: "Program Details: Curriculum, Projects & Outcomes | Clouds Trail",
    description:
      "Review curriculum, modules, projects, and outcomes for each program to choose the right Salesforce, cloud, or IT career training path.",
    keywords: [
      "salesforce course details",
      "cloud career program",
      "project-based training",
      "placement support program",
    ],
  },
  {
    matcher: /^\/blog$/,
    title: "Salesforce, Cloud & Career Blog | Clouds Trail Institute",
    description:
      "Read practical Salesforce, cloud, and career blogs covering interview preparation, implementation guidance, and job-ready training insights.",
    keywords: [
      "salesforce blog",
      "cloud career blog",
      "placement preparation",
      "training insights",
      "salesforce administration guides",
    ],
  },
  {
    matcher: /^\/blog\/[^/]+$/,
    title: "Career Training Blog Article & Insights | Clouds Trail",
    description:
      "Read actionable, project-led guidance with practical examples and interview-ready strategies to support your Salesforce and cloud career growth.",
    keywords: [
      "salesforce article",
      "cloud training article",
      "career guidance",
      "placement strategies",
    ],
  },
  {
    matcher: /^\/about$/,
    title: "About Clouds Trail Training Institute | Mentors & Placements",
    description:
      "Learn how Clouds Trail delivers practical training through mentor-led learning, real projects, and placement-focused support for career success.",
    keywords: [
      "about clouds trail",
      "salesforce training institute",
      "career mentorship",
      "placement support",
    ],
  },
  {
    matcher: /^\/contact$/,
    title: "Contact Clouds Trail for Admissions & Career Guidance",
    description:
      "Contact Clouds Trail for admissions, batch schedules, counseling, and guidance on selecting the right Salesforce or cloud training program.",
    keywords: [
      "contact clouds trail",
      "salesforce admissions",
      "cloud training counseling",
      "career guidance",
    ],
  },
  {
    matcher: /^\/enroll$/,
    title: "Enroll in Salesforce and Workday Programs | Clouds Trail",
    description:
      "Start enrollment in Salesforce and Workday programs with practical modules, mentor guidance, and placement-focused learning outcomes.",
    keywords: [
      "enroll salesforce program",
      "workday training enrollment",
      "career placement training",
      "clouds trail admissions",
    ],
  },
  {
    matcher: /^\/terms$/,
    title: "Terms and Conditions for Clouds Trail Programs & Services",
    description:
      "Review the terms and conditions that govern access, usage, admissions, and participation in Clouds Trail website services and training programs.",
    keywords: [
      "clouds trail terms",
      "training institute terms and conditions",
      "program usage policy",
    ],
  },
  {
    matcher: /^\/privacy$/,
    title: "Privacy Policy for Clouds Trail Website and Programs",
    description:
      "Understand how Clouds Trail collects, uses, stores, and protects personal information across website usage, communication, and program delivery.",
    keywords: [
      "clouds trail privacy policy",
      "student data protection",
      "website privacy",
    ],
  },
  {
    matcher: /^\/refund$/,
    title: "Refund Policy for Clouds Trail Programs and Services",
    description:
      "Check eligibility, timelines, and process details for refund requests related to Clouds Trail programs, fees, and service commitments.",
    keywords: [
      "clouds trail refund policy",
      "training fee refund terms",
      "program refund process",
    ],
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

function ensureJsonLd(data: unknown | null): void {
  let script = document.head.querySelector(`#${JSON_LD_SCRIPT_ID}`) as HTMLScriptElement | null;

  if (!data) {
    if (script) script.remove();
    return;
  }

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = JSON_LD_SCRIPT_ID;
    document.head.appendChild(script);
  }

  script.text = JSON.stringify(data);
}

function normalizeText(raw: unknown): string {
  return `${raw || ""}`.replace(/\s+/g, " ").trim();
}

function smartTrim(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const candidate = text.slice(0, maxChars + 1);
  const breakAt = candidate.lastIndexOf(" ");
  return (breakAt > Math.floor(maxChars * 0.7) ? candidate.slice(0, breakAt) : text.slice(0, maxChars)).trim();
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "your",
  "you",
  "our",
  "that",
  "this",
  "are",
  "was",
  "will",
  "how",
  "what",
  "who",
  "when",
  "where",
  "why",
  "to",
  "of",
  "in",
  "on",
  "at",
  "a",
  "an",
  "or",
  "as",
  "by",
  "it",
  "is",
  "be",
  "we",
  "us",
  "learn",
  "training",
  "program",
  "programs",
]);

function extractKeywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function ensureDescriptionKeywordOverlap(title: string, description: string): string {
  const titleTokens = Array.from(new Set(extractKeywordTokens(title)));
  if (titleTokens.length === 0) return description;

  const descriptionTokens = new Set(extractKeywordTokens(description));
  const overlapCount = titleTokens.filter((token) => descriptionTokens.has(token)).length;
  if (overlapCount >= 2) return description;

  const additions = titleTokens.slice(0, 2).join(" and ");
  if (!additions) return description;

  const merged = `${description} Focus areas include ${additions}.`.replace(/\s+/g, " ").trim();
  return merged.length > 160 ? `${smartTrim(merged, 157).replace(/[.,;:!?-]+$/, "")}...` : merged;
}

function fitSeoTitle(rawTitle: unknown, fallbackTitle: string): string {
  let title = normalizeText(rawTitle) || normalizeText(fallbackTitle) || "Clouds Trail Training Institute";

  if (!/clouds trail/i.test(title)) {
    title = `${title} | Clouds Trail`;
  }

  if (title.length < 50) {
    title = `${title} Training Programs`;
  }

  return smartTrim(title, 60);
}

function fitSeoDescription(rawDescription: unknown, fallbackDescription: string): string {
  let description = normalizeText(rawDescription) || normalizeText(fallbackDescription);

  if (description.length < 120) {
    description = `${description} Learn practical skills through projects, mentor support, and placement-focused guidance.`.trim();
  }

  if (description.length > 160) {
    description = `${smartTrim(description, 157).replace(/[.,;:!?-]+$/, "")}...`;
  }

  return description;
}

function parseKeywords(rawKeywords: unknown, fallback: string[]): string[] {
  if (Array.isArray(rawKeywords)) {
    const keywords = rawKeywords.map((item) => normalizeText(item)).filter(Boolean);
    if (keywords.length) return keywords;
  }

  if (typeof rawKeywords === "string") {
    const keywords = rawKeywords.split(",").map((item) => normalizeText(item)).filter(Boolean);
    if (keywords.length) return keywords;
  }

  return fallback.length ? fallback : DEFAULT_KEYWORDS;
}

function parseSchemaMarkup(rawSchema: unknown): unknown | null {
  if (!rawSchema) return null;
  if (typeof rawSchema === "string") {
    try {
      const parsed = JSON.parse(rawSchema);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  if (typeof rawSchema === "object") return rawSchema;
  return null;
}

function resolveOgType(path: string): "article" | "website" {
  return /^\/blog\/[^/]+$/.test(path) ? "article" : "website";
}

function buildFallbackSchema(path: string, canonicalUrl: string, title: string, description: string) {
  const orgId = `${CANONICAL_ORIGIN}#organization`;
  const websiteId = `${CANONICAL_ORIGIN}#website`;
  const localBusinessId = `${CANONICAL_ORIGIN}#localbusiness`;
  const webpageId = `${canonicalUrl}#webpage`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: "Clouds Trail",
      url: CANONICAL_ORIGIN,
      logo: `${CANONICAL_ORIGIN}/favicon.ico`,
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: BUSINESS_PHONE,
          contactType: "customer support",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "Clouds Trail",
      url: CANONICAL_ORIGIN,
      inLanguage: "en-IN",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: canonicalUrl,
      name: title,
      description,
      isPartOf: { "@id": websiteId },
      about: { "@id": orgId },
      inLanguage: "en-IN",
    },
    {
      "@type": "LocalBusiness",
      "@id": localBusinessId,
      name: "Clouds Trail",
      url: CANONICAL_ORIGIN,
      telephone: BUSINESS_PHONE,
      address: BUSINESS_ADDRESS,
      areaServed: "IN",
      image: `${CANONICAL_ORIGIN}/og-image.png`,
      parentOrganization: { "@id": orgId },
    },
  ];

  if (path === "/") {
    graph.push({
      "@type": "EducationalOrganization",
      "@id": `${CANONICAL_ORIGIN}#edu`,
      name: "Clouds Trail",
      url: CANONICAL_ORIGIN,
      parentOrganization: { "@id": orgId },
    });
  } else if (/^\/course\/[^/]+$/.test(path)) {
    graph.push({
      "@type": "Course",
      name: title.replace(/\s*\|\s*Clouds Trail.*$/i, "").trim(),
      description,
      provider: { "@id": orgId },
    });
  } else if (path === "/blog") {
    graph.push({
      "@type": "CollectionPage",
      name: "Clouds Trail Blogs",
      url: canonicalUrl,
      description,
      isPartOf: { "@id": websiteId },
    });
  } else if (/^\/blog\/[^/]+$/.test(path)) {
    graph.push({
      "@type": "BlogPosting",
      headline: title.replace(/\s*\|\s*Clouds Trail.*$/i, "").trim(),
      description,
      mainEntityOfPage: { "@id": webpageId },
      publisher: { "@id": orgId },
    });
  } else if (path === "/contact") {
    graph.push({
      "@type": "ContactPage",
      name: title.replace(/\s*\|\s*Clouds Trail.*$/i, "").trim(),
      url: canonicalUrl,
      description,
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function resolveFallbackMeta(path: string): { title: string; description: string; keywords: string[] } {
  for (const item of ROUTE_META_DEFAULTS) {
    if (item.matcher.test(path)) {
      return {
        title: item.title,
        description: item.description,
        keywords: item.keywords,
      };
    }
  }
  return {
    title: "Clouds Trail",
    description: "Clouds Trail offers practical, industry-ready IT learning programs with mentorship and placement-focused outcomes.",
    keywords: DEFAULT_KEYWORDS,
  };
}

const RouteSeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = normalizePath(pathname);
    const canonicalFallbackUrl = `${CANONICAL_ORIGIN}${normalizedPath}`;
    const isAdminRoute = normalizedPath.startsWith("/admin");
    const isShortLinkRoute = /^\/s\/[^/]+$/.test(normalizedPath);
    const fallback = resolveFallbackMeta(normalizedPath);
    const fallbackTitle = fitSeoTitle(fallback.title, fallback.title);
    const fallbackDescription = ensureDescriptionKeywordOverlap(
      fallbackTitle,
      fitSeoDescription(fallback.description, fallback.description),
    );
    const fallbackKeywords = parseKeywords(null, fallback.keywords);
    const fallbackSchema = buildFallbackSchema(
      normalizedPath,
      canonicalFallbackUrl,
      fallbackTitle,
      fallbackDescription,
    );

    document.title = fallbackTitle;
    ensureCanonicalLink(canonicalFallbackUrl);
    ensureMetaTag("property", "og:url", canonicalFallbackUrl);
    ensureMetaTag("property", "og:type", resolveOgType(normalizedPath));
    ensureMetaTag("name", "description", fallbackDescription);
    ensureMetaTag("property", "og:title", fallbackTitle);
    ensureMetaTag("property", "og:description", fallbackDescription);
    ensureMetaTag("name", "twitter:card", "summary_large_image");
    ensureMetaTag("name", "twitter:title", fallbackTitle);
    ensureMetaTag("name", "twitter:description", fallbackDescription);
    ensureMetaTag("name", "keywords", fallbackKeywords.join(", "));
    ensureMetaTag(
      "name",
      "robots",
      isAdminRoute || isShortLinkRoute ? "noindex, nofollow, noarchive" : "index, follow",
    );

    if (isAdminRoute || isShortLinkRoute) {
      ensureJsonLd(null);
      return;
    }

    ensureJsonLd(fallbackSchema);

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("seo_settings")
        .select("title,description,canonical_url,indexing_enabled,robots_directive,keywords,schema_markup")
        .eq("page_path", normalizedPath)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const overridePath = normalizeCanonicalPath(data.canonical_url, normalizedPath);
      const canonicalPath = isValidCanonicalOverride(normalizedPath, overridePath)
        ? overridePath
        : normalizedPath;
      const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
      const finalTitle = fitSeoTitle(data.title, fallback.title);
      const finalDescription = ensureDescriptionKeywordOverlap(
        finalTitle,
        fitSeoDescription(data.description, fallback.description),
      );
      const finalKeywords = parseKeywords(data.keywords, fallback.keywords);
      const robots =
        data.indexing_enabled === false
          ? "noindex, nofollow"
          : (`${data.robots_directive || ""}`.trim() || "index, follow");
      const dbSchema = parseSchemaMarkup(data.schema_markup);
      const finalSchema = dbSchema || buildFallbackSchema(normalizedPath, canonicalUrl, finalTitle, finalDescription);

      document.title = finalTitle;
      ensureCanonicalLink(canonicalUrl);
      ensureMetaTag("property", "og:url", canonicalUrl);
      ensureMetaTag("property", "og:type", resolveOgType(normalizedPath));
      ensureMetaTag("name", "description", finalDescription);
      ensureMetaTag("property", "og:title", finalTitle);
      ensureMetaTag("property", "og:description", finalDescription);
      ensureMetaTag("name", "twitter:card", "summary_large_image");
      ensureMetaTag("name", "twitter:title", finalTitle);
      ensureMetaTag("name", "twitter:description", finalDescription);
      ensureMetaTag("name", "keywords", finalKeywords.join(", "));
      ensureMetaTag("name", "robots", robots);
      ensureJsonLd(finalSchema);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
};

export default RouteSeoManager;
