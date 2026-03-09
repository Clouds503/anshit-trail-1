import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, FileCheck2, RefreshCcw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import { cn } from "@/lib/utils";
import {
  ensureMinimumUsefulWords,
  normalizeSeoContentBlocks,
  type SeoContentBlock,
} from "@/lib/seo-content-normalizer";

type BlockStyle = {
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  bold?: boolean;
  underline?: boolean;
};

type ContentBlock = SeoContentBlock & { style?: BlockStyle };

interface PageData {
  page_title: string;
  hero_image_url?: string;
  hero_subtitle?: string;
  content: ContentBlock[];
}

const sizeClassMap: Record<NonNullable<BlockStyle["size"]>, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const textClasses = (style?: BlockStyle, fallback: NonNullable<BlockStyle["size"]> = "base") =>
  cn(sizeClassMap[style?.size || fallback], style?.bold ? "font-bold" : "", style?.underline ? "underline" : "");

const slugMeta: Record<
  string,
  {
    badge: string;
    subtitle: string;
    intro: string;
    outro: string;
    highlights: string[];
    icon: "terms" | "privacy" | "refund";
  }
> = {
  terms: {
    badge: "Terms & Conditions",
    subtitle:
      "Understand usage rights, responsibilities, and policy boundaries so your learning journey stays clear and protected.",
    intro:
      "These terms define how this website and our learning services should be used responsibly. Reading them carefully helps you understand account use, communication standards, and enrollment commitments before participating in any program.",
    outro:
      "If you need clarity on any clause, contact our support team before making decisions. We recommend reviewing this page periodically because legal and operational updates may be published over time.",
    highlights: [
      "Platform usage responsibilities and acceptable conduct",
      "Enrollment and service-related commitments",
      "Policy updates and communication obligations",
    ],
    icon: "terms",
  },
  privacy: {
    badge: "Privacy Policy",
    subtitle:
      "Know how your personal information is collected, used, stored, and protected while interacting with our website and programs.",
    intro:
      "Your privacy matters to us. This policy explains what information we collect, why we collect it, how we use it for service delivery, and what steps we take to protect your data with responsible access controls.",
    outro:
      "For any privacy concerns or data-related requests, reach out to our team through official contact channels. We continuously improve our data practices to maintain trust, transparency, and compliance.",
    highlights: [
      "Data collection scope and lawful usage intent",
      "Storage safeguards and internal access controls",
      "User rights for communication and data updates",
    ],
    icon: "privacy",
  },
  refund: {
    badge: "Refund Policy",
    subtitle:
      "Review eligibility criteria, timelines, and process flow for refunds so you can make informed enrollment decisions.",
    intro:
      "This policy outlines refund conditions, request timelines, and verification steps for enrolled learners. Please review the requirements carefully before purchasing to avoid misunderstandings related to payment and eligibility.",
    outro:
      "Refund outcomes depend on the terms listed in this document and may vary by program stage or payment status. Always submit your request with complete details for faster review and resolution.",
    highlights: [
      "Refund eligibility based on policy conditions",
      "Request timelines and required submission details",
      "Processing stages and confirmation communication",
    ],
    icon: "refund",
  },
};

const getPolicyIcon = (type: "terms" | "privacy" | "refund") => {
  if (type === "privacy") return ShieldCheck;
  if (type === "refund") return RefreshCcw;
  return FileCheck2;
};

const normalizeToken = (value?: string | null) =>
  `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

interface DynamicPageProps {
  slug: string;
  beforeFooter?: ReactNode;
}

const DynamicPage = ({ slug, beforeFooter }: DynamicPageProps) => {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("page_content")
        .select("*")
        .eq("page_slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
        const blocks = normalizeSeoContentBlocks(Array.isArray(content) ? content : [], {
          heroTitle: data.page_title || "",
          pageTitle: data.page_title || slug,
        });
        const withDepth = ensureMinimumUsefulWords(blocks, {
          minWords: 780,
          pageLabel: data.page_title || slug,
          focusTopic: data.hero_subtitle || "",
        });
        setPage({ ...data, content: withDepth as ContentBlock[] });
      }
      setLoading(false);
    })();
  }, [slug]);

  const meta = slugMeta[slug] || {
    badge: "Policy Information",
    subtitle:
      "Review important information and policy details carefully to understand your rights, responsibilities, and available support.",
    intro:
      "This page provides important policy details to help you make informed decisions while using our services.",
    outro:
      "For additional clarity, connect with our support team through official channels.",
    highlights: ["Important terms", "User responsibilities", "Support process"],
    icon: "terms" as const,
  };

  const PolicyIcon = getPolicyIcon(meta.icon);

  const contentBlocks = useMemo(() => {
    if (!page) return [];
    const normalizedTitle = normalizeToken(page.page_title);
    return page.content.filter(
      (block) => !(block.type === "heading" && normalizeToken(block.text) === normalizedTitle),
    );
  }, [page]);

  const introParagraph = useMemo(() => {
    const firstParagraph = contentBlocks.find((block) => block.type === "paragraph" && block.text)?.text;
    return firstParagraph || meta.intro;
  }, [contentBlocks, meta.intro]);

  const highlights = useMemo(() => {
    const firstList = contentBlocks.find((block) => block.type === "list" && (block.items || []).length > 0);
    const list = (firstList?.items || []).slice(0, 3);
    return list.length ? list : meta.highlights;
  }, [contentBlocks, meta.highlights]);

  const remainingBlocks = useMemo(() => {
    let skippedIntro = false;
    return contentBlocks.filter((block) => {
      if (!skippedIntro && block.type === "paragraph" && block.text === introParagraph) {
        skippedIntro = true;
        return false;
      }
      return true;
    });
  }, [contentBlocks, introParagraph]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Page not found</div>
        <Footer />
      </div>
    );
  }

  const heroSubtitle = `${page.hero_subtitle || meta.subtitle}`.trim() || meta.subtitle;

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.32), transparent 42%), radial-gradient(circle at 80% 5%, rgba(14, 165, 233, 0.24), transparent 33%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-20 hidden h-72 w-72 rounded-full bg-sky-400/18 blur-3xl sm:block"
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-28 bottom-2 hidden h-80 w-80 rounded-full bg-cyan-300/14 blur-3xl sm:block"
          animate={{ x: [0, -20, 0], y: [0, 22, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-10 sm:py-16 md:py-20 lg:py-24">
          <div className="grid items-start gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-5"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-xs sm:tracking-[0.22em]">
                {meta.badge}
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-5xl lg:text-6xl">
                {page.page_title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-lg md:text-xl">{heroSubtitle}</p>
              <div className="pt-1">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-lg border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  Need Clarification
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <PolicyIcon className="h-5 w-5 text-cyan-100" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Policy Highlights</p>
              <div className="mt-3 space-y-2.5">
                {highlights.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border border-white/15 bg-white/10 p-3.5">
                    <p className="text-sm text-white/90">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-10 md:py-14">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10 p-4 sm:p-7"
          >
            <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{introParagraph}</p>
          </motion.div>
        </div>
      </section>

      <section className="pb-10 md:pb-14 lg:pb-16">
        <div className="container max-w-5xl">
          <article className="space-y-5 rounded-3xl border bg-card/70 p-5 shadow-sm sm:p-8 md:space-y-6 md:p-10">
            {remainingBlocks.map((block, i) => {
              if (block.type === "heading") {
                return (
                  <motion.h2
                    key={`h-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                    className={cn("font-heading text-foreground mt-2 font-extrabold tracking-tight", textClasses(block.style, "3xl"))}
                  >
                    {block.text}
                  </motion.h2>
                );
              }

              if (block.type === "subheading") {
                return (
                  <motion.h3
                    key={`s-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.2) }}
                    className={cn("font-heading text-foreground mt-1 font-bold tracking-tight", textClasses(block.style, "xl"))}
                  >
                    {block.text}
                  </motion.h3>
                );
              }

              if (block.type === "paragraph") {
                return (
                  <motion.p
                    key={`p-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.2) }}
                    className={cn("text-muted-foreground leading-7 sm:leading-8", textClasses(block.style, "base"))}
                  >
                    {block.text}
                  </motion.p>
                );
              }

              if (block.type === "list") {
                return (
                  <motion.div
                    key={`l-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.2) }}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  >
                    {(block.items || []).map((item, j) => (
                      <div key={`${item}-${j}`} className="flex items-start gap-2 rounded-lg border bg-background p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-sm leading-relaxed text-foreground">{item}</p>
                      </div>
                    ))}
                  </motion.div>
                );
              }

              if (block.type === "image" && block.url) {
                return (
                  <motion.figure
                    key={`img-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.2) }}
                    className="my-3"
                  >
                    <img
                      src={block.url}
                      alt={block.alt || ""}
                      className="w-full max-h-[460px] rounded-xl border object-cover"
                      loading="lazy"
                    />
                    {block.alt ? <figcaption className="mt-2 text-xs text-muted-foreground">{block.alt}</figcaption> : null}
                  </motion.figure>
                );
              }

              return null;
            })}
          </article>
        </div>
      </section>

      <section className="pb-10 md:pb-12">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border bg-gradient-to-r from-accent/25 via-background to-accent/20 p-4 sm:p-7"
          >
            <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{meta.outro}</p>
          </motion.div>
        </div>
      </section>

      {beforeFooter}
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default DynamicPage;
