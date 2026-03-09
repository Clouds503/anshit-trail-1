import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import { motion } from "framer-motion";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { getBlogPostBySlug } from "@/data/blogPosts";
import NotFound from "./NotFound";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseMarkdownToBlocks } from "@/lib/blog-content";
import { cn } from "@/lib/utils";

type BlockStyle = {
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  bold?: boolean;
  underline?: boolean;
};

type TypographyBlock = {
  type: "heading" | "subheading" | "paragraph" | "points" | "image";
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  style?: BlockStyle;
};

type DbBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  content: string;
  contentBlocks: TypographyBlock[];
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

const textClasses = (style?: BlockStyle, fallback: NonNullable<BlockStyle["size"]> = "base") =>
  cn(sizeClassMap[style?.size || fallback], style?.bold ? "font-bold" : "", style?.underline ? "underline" : "");

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const renderMarkdownContent = (content: string) => {
  const blocks = parseMarkdownToBlocks(content);
  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          if (block.level <= 2) {
            return (
              <h2 key={idx} className="text-2xl font-heading font-bold text-foreground mt-8 mb-3">
                {block.text}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-xl font-heading font-bold text-foreground mt-6 mb-2">
              {block.text}
            </h3>
          );
        }

        if (block.type === "image") {
          return (
            <figure key={idx} className="my-8">
              <img
                src={block.src}
                alt={block.alt || "Blog image"}
                className="w-full max-h-[460px] rounded-xl border object-cover"
                loading="lazy"
              />
              {block.alt ? <figcaption className="text-xs text-muted-foreground mt-2">{block.alt}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="list-disc pl-6 space-y-2 text-muted-foreground text-[15px] leading-relaxed">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-muted-foreground leading-relaxed text-[15px]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

const renderStyledBlocks = (blocks: TypographyBlock[]) => (
  <div className="space-y-5">
    {blocks.map((block, idx) => {
      if (block.type === "heading") {
        return (
          <h2 key={idx} className={cn("font-heading text-foreground mt-8 mb-3", textClasses(block.style, "3xl"))}>
            {block.text}
          </h2>
        );
      }

      if (block.type === "subheading") {
        return (
          <h3 key={idx} className={cn("font-heading text-foreground mt-6 mb-2", textClasses(block.style, "xl"))}>
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

      if (block.type === "points") {
        return (
          <ul key={idx} className="list-disc pl-6 space-y-2 text-muted-foreground text-[15px] leading-relaxed">
            {(block.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }

      if (block.type === "image" && block.url) {
        return (
          <figure key={idx} className="my-8">
            <img src={block.url} alt={block.alt || "Blog image"} className="w-full max-h-[460px] rounded-xl border object-cover" loading="lazy" />
            {block.alt ? <figcaption className="text-xs text-muted-foreground mt-2">{block.alt}</figcaption> : null}
          </figure>
        );
      }

      return null;
    })}
  </div>
);

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { data: dbPost, isLoading } = useQuery({
    queryKey: ["blog_post", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blogs")
        .select("slug,title,excerpt,category,image_url,created_at,content,content_blocks,is_published")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!data) return null;
      return {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt || "",
        category: data.category || "General",
        image: data.image_url || "",
        date: formatDate(data.created_at),
        content: data.content || "",
        contentBlocks: Array.isArray(data.content_blocks) ? data.content_blocks : [],
      } as DbBlogPost;
    },
  });

  const fallbackPost = slug ? getBlogPostBySlug(slug) : undefined;

  useEffect(() => {
    if (!slug) return;
    const channel = supabase
      .channel(`public-blog-post-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blogs", filter: `slug=eq.${slug}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["blog_post", slug] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, slug]);

  if (!isLoading && !dbPost && !fallbackPost) return <NotFound />;

  const title = dbPost?.title || fallbackPost?.title || "";
  const category = dbPost?.category || fallbackPost?.category || "General";
  const date = dbPost?.date || fallbackPost?.date || "Recently";
  const image = dbPost?.image || fallbackPost?.image || "";

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <article className="py-12 md:py-20">
        <div className="container max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          {isLoading ? (
            <div className="text-muted-foreground text-sm py-10">Loading article...</div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-accent px-2.5 py-1 rounded-full mb-4">
                  {category}
                </span>
                <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground leading-tight mb-4">{title}</h1>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
                  <CalendarDays className="h-4 w-4" />
                  {date}
                </div>
                {image ? <img src={image} alt={title} className="w-full h-64 md:h-80 object-cover rounded-xl mb-10" /> : null}
              </motion.div>

              <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                {dbPost
                  ? dbPost.contentBlocks.length
                    ? renderStyledBlocks(dbPost.contentBlocks)
                    : renderMarkdownContent(dbPost.content)
                  : fallbackPost?.content.map((paragraph, i) => (
                      <p key={i} className="text-muted-foreground leading-relaxed text-[15px]">
                        {paragraph}
                      </p>
                    ))}
              </motion.div>
            </>
          )}

          <div className="mt-12 pt-8 border-t">
            <p className="text-foreground font-heading font-bold text-lg mb-2">Interested in learning more?</p>
            <p className="text-muted-foreground text-sm mb-4">
              Explore our programs and kickstart your tech career with industry-expert mentorship.
            </p>
            <Link
              to="/programs"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Explore Programs
            </Link>
          </div>
        </div>
      </article>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default BlogPost;
