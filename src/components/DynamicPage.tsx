import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import PageHero from "@/components/PageHero";
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

interface DynamicPageProps {
  slug: string;
  beforeFooter?: ReactNode;
}

const DynamicPage = ({ slug, beforeFooter }: DynamicPageProps) => {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("page_content").select("*").eq("page_slug", slug).eq("is_active", true).maybeSingle();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Page not found</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />
      <PageHero title={page.page_title} subtitle={page.hero_subtitle || undefined} imageUrl={page.hero_image_url || undefined} />
      <div className="container py-12 md:py-16 max-w-5xl">
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          {page.content.map((block, i) => {
            if (block.type === "heading") {
              return (
                <h2 key={i} className={cn("font-heading text-foreground mt-8", textClasses(block.style, "3xl"))}>
                  {block.text}
                </h2>
              );
            }
            if (block.type === "subheading") {
              return (
                <h3 key={i} className={cn("font-heading text-foreground mt-4", textClasses(block.style, "xl"))}>
                  {block.text}
                </h3>
              );
            }
            if (block.type === "paragraph") {
              return (
                <p key={i} className={cn("text-muted-foreground", textClasses(block.style, "base"))}>
                  {block.text}
                </p>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={i} className="list-disc pl-5 space-y-2 text-base">
                  {block.items?.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            if (block.type === "image" && block.url) {
              return (
                <figure key={i} className="my-3">
                  <img src={block.url} alt={block.alt || ""} className="w-full max-h-[460px] rounded-lg border object-cover" loading="lazy" />
                  {block.alt ? <figcaption className="text-xs text-muted-foreground mt-2">{block.alt}</figcaption> : null}
                </figure>
              );
            }
            return null;
          })}
        </div>
      </div>
      {beforeFooter}
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default DynamicPage;
