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
  limitToFirstBlocks?: number;
  skipFirstBlocks?: number;
  allowedTypes?: ContentBlock["type"][];
  segmentIndex?: number;
  maxBlocksInSegment?: number;
};

const PageSeoContent = ({
  slug,
  className = "",
  heroTitle,
  excludedHeadings,
  minUsefulWords = 420,
  limitToFirstBlocks,
  skipFirstBlocks = 0,
  allowedTypes,
  segmentIndex,
  maxBlocksInSegment,
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

  let blocksToRender = data;
  if (allowedTypes && allowedTypes.length > 0) {
    blocksToRender = blocksToRender.filter((block) => allowedTypes.includes(block.type));
  }
  if (typeof segmentIndex === "number") {
    const segments: ContentBlock[][] = [];
    let currentSegment: ContentBlock[] = [];

    blocksToRender.forEach((block) => {
      if (block.type === "heading") {
        if (currentSegment.length > 0) segments.push(currentSegment);
        currentSegment = [block];
        return;
      }
      if (currentSegment.length === 0) {
        currentSegment = [block];
        return;
      }
      currentSegment.push(block);
    });

    if (currentSegment.length > 0) segments.push(currentSegment);
    blocksToRender = segments[segmentIndex] || [];
  }
  if (skipFirstBlocks > 0) {
    blocksToRender = blocksToRender.slice(skipFirstBlocks);
  }
  if (limitToFirstBlocks) {
    blocksToRender = blocksToRender.slice(0, limitToFirstBlocks);
  }
  if (maxBlocksInSegment) {
    blocksToRender = blocksToRender.slice(0, maxBlocksInSegment);
  }
  if (blocksToRender.length === 0) return null;

  return (
    <section className={cn("py-14 md:py-16", className)}>
      <div className="container max-w-5xl">
        <div className="space-y-5 rounded-2xl border bg-card/75 p-4 shadow-sm sm:p-6">
          {blocksToRender.map((block, idx) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={idx}
                  className={cn(
                    "font-heading text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl",
                    textClasses(block.style, "3xl"),
                  )}
                >
                  {block.text}
                </h2>
              );
            }

            if (block.type === "subheading") {
              return (
                <h3
                  key={idx}
                  className={cn(
                    "font-heading text-xs font-bold uppercase tracking-[0.18em] text-primary sm:text-sm",
                    textClasses(block.style, "sm"),
                  )}
                >
                  {block.text}
                </h3>
              );
            }

            if (block.type === "paragraph") {
              return (
                <p
                  key={idx}
                  className={cn(
                    "text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8",
                    textClasses(block.style, "base"),
                  )}
                >
                  {block.text}
                </p>
              );
            }

            if (block.type === "list") {
              return (
                <ul key={idx} className="list-disc space-y-2.5 pl-6 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
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
