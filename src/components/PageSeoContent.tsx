import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

type ContentBlock = {
  type: "heading" | "subheading" | "paragraph" | "list" | "image";
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  style?: BlockStyle;
};

const sizeClassMap: Record<NonNullable<BlockStyle["size"]>, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const textClasses = (style?: BlockStyle, fallbackSize: NonNullable<BlockStyle["size"]> = "base") =>
  cn(
    sizeClassMap[style?.size || fallbackSize],
    style?.bold ? "font-bold" : "",
    style?.underline ? "underline" : "",
  );

type PageSeoContentProps = {
  slug: string;
  className?: string;
  heroTitle?: string;
  excludedHeadings?: string[];
  minUsefulWords?: number;
};

const PageSeoContent = ({
  slug,
  className = "",
  heroTitle,
  excludedHeadings,
  minUsefulWords = 420,
}: PageSeoContentProps) => {
  const { data } = useQuery({
    queryKey: ["page-seo-content", slug],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("page_content")
        .select("page_title,hero_subtitle,content,is_active")
        .eq("page_slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!data?.content) return [];
      const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
      const blocks = Array.isArray(content) ? (content as SeoContentBlock[]) : [];
      const normalized = normalizeSeoContentBlocks(blocks, {
        heroTitle: heroTitle || data.page_title || data.hero_subtitle || "",
        pageTitle: data.page_title || slug,
        excludedHeadings,
      });
      const withDepth = ensureMinimumUsefulWords(normalized, {
        minWords: minUsefulWords,
        pageLabel: data.page_title || slug,
        focusTopic: data.hero_subtitle || "",
      });
      return withDepth as ContentBlock[];
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <section className={cn("py-14 md:py-16", className)}>
      <div className="container max-w-5xl">
        <div className="space-y-6">
          {data.map((block, idx) => {
            if (block.type === "heading") {
              return (
                <h2 key={idx} className={cn("font-heading text-foreground leading-tight", textClasses(block.style, "3xl"))}>
                  {block.text}
                </h2>
              );
            }

            if (block.type === "subheading") {
              return (
                <h3 key={idx} className={cn("font-heading text-foreground leading-snug", textClasses(block.style, "xl"))}>
                  {block.text}
                </h3>
              );
            }

            if (block.type === "paragraph") {
              return (
                <p key={idx} className={cn("text-muted-foreground leading-relaxed", textClasses(block.style, "base"))}>
                  {block.text}
                </p>
              );
            }

            if (block.type === "list") {
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2 text-muted-foreground text-base leading-relaxed">
                  {(block.items || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
            }

            if (block.type === "image" && block.url) {
              return (
                <figure key={idx} className="my-3">
                  <img
                    src={block.url}
                    alt={block.alt || ""}
                    className="w-full max-h-[460px] rounded-xl border object-cover"
                    loading="lazy"
                  />
                  {block.alt ? <figcaption className="text-xs text-muted-foreground mt-2">{block.alt}</figcaption> : null}
                </figure>
              );
            }

            return null;
          })}
        </div>
      </div>
    </section>
  );
};

export default PageSeoContent;
