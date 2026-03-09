import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import PublicLongformContent from "@/components/PublicLongformContent";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, CalendarDays, Clock3, Sparkles } from "lucide-react";
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

const countWords = (value: string) => {
  const clean = value.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
};

const estimateReadTime = (value: string) => {
  const words = countWords(value);
  if (!words) return 2;
  return Math.max(2, Math.ceil(words / 190));
};

const blocksToText = (blocks: TypographyBlock[]) =>
  blocks
    .map((block) => {
      if (block.type === "points") return (block.items || []).join(" ");
      if (block.type === "heading" || block.type === "subheading" || block.type === "paragraph") return block.text || "";
      return "";
    })
    .join(" ");

const renderMarkdownContent = (content: string) => {
  const blocks = parseMarkdownToBlocks(content);
  return (
    <div className="space-y-6 sm:space-y-7">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          if (block.level <= 2) {
            return (
              <h2 key={idx} className="mt-10 text-2xl font-heading font-black leading-tight text-foreground sm:text-3xl">
                {block.text}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="mt-8 text-xl font-heading font-black leading-tight text-foreground sm:text-2xl">
              {block.text}
            </h3>
          );
        }

        if (block.type === "image") {
          return (
            <figure key={idx} className="my-8 overflow-hidden rounded-2xl border border-border/70 bg-card/70">
              <img
                src={block.src}
                alt={block.alt || "Blog image"}
                className="max-h-[460px] w-full object-cover"
                loading="lazy"
              />
              {block.alt ? <figcaption className="px-4 py-3 text-xs text-muted-foreground">{block.alt}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="list-disc space-y-3 pl-6 text-[15px] leading-7 text-muted-foreground marker:text-primary/80 sm:text-[17px] sm:leading-8">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-[15px] leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

const renderStyledBlocks = (blocks: TypographyBlock[]) => (
  <div className="space-y-6 sm:space-y-7">
    {blocks.map((block, idx) => {
      if (block.type === "heading") {
        return (
          <h2
            key={idx}
            className={cn(
              "mt-10 font-heading font-black leading-tight text-foreground",
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
              "mt-8 font-heading font-black leading-tight text-foreground",
              textClasses(block.style, "xl"),
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
              "text-[15px] leading-7 text-muted-foreground sm:text-[17px] sm:leading-8",
              textClasses(block.style, "base"),
            )}
          >
            {block.text}
          </p>
        );
      }

      if (block.type === "points") {
        return (
          <ul key={idx} className="list-disc space-y-3 pl-6 text-[15px] leading-7 text-muted-foreground marker:text-primary/80 sm:text-[17px] sm:leading-8">
            {(block.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }

      if (block.type === "image" && block.url) {
        return (
          <figure key={idx} className="my-8 overflow-hidden rounded-2xl border border-border/70 bg-card/70">
            <img src={block.url} alt={block.alt || "Blog image"} className="max-h-[460px] w-full object-cover" loading="lazy" />
            {block.alt ? <figcaption className="px-4 py-3 text-xs text-muted-foreground">{block.alt}</figcaption> : null}
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
  const excerpt =
    dbPost?.excerpt ||
    fallbackPost?.excerpt ||
    "Practical, role-ready insight crafted to help you translate learning into outcomes.";
  const contentSource = dbPost
    ? dbPost.contentBlocks.length
      ? blocksToText(dbPost.contentBlocks)
      : dbPost.content
    : (fallbackPost?.content || []).join(" ");
  const readMinutes = estimateReadTime(contentSource);
  const structuredSections = dbPost
    ? dbPost.contentBlocks.length
      ? dbPost.contentBlocks.filter((block) => block.type === "heading" || block.type === "subheading").length
      : parseMarkdownToBlocks(dbPost.content).filter((block) => block.type === "heading").length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.34), transparent 40%), radial-gradient(circle at 84% 10%, rgba(14, 165, 233, 0.26), transparent 34%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-14 hidden h-72 w-72 rounded-full bg-sky-400/20 blur-3xl sm:block"
          animate={{ x: [0, 22, 0], y: [0, -20, 0] }}
          transition={{ duration: 9.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-20 bottom-8 hidden h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl sm:block"
          animate={{ x: [0, -20, 0], y: [0, 18, 0] }}
          transition={{ duration: 10.8, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
        />

        <div className="container relative py-10 sm:py-14 md:py-18 lg:py-20">
          <Link
            to="/blog"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/15 sm:text-[11px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
          </Link>

          <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-5"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" /> Knowledge Article
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-4xl md:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base md:text-lg">{excerpt}</p>

              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                  {category}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {date}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                  <Clock3 className="h-3.5 w-3.5" />
                  {readMinutes} min read
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="space-y-3 sm:space-y-4"
            >
              {image ? (
                <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-slate-950/20 backdrop-blur-lg">
                  <img src={image} alt={title} className="h-52 w-full object-cover sm:h-60 md:h-64" loading="lazy" />
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-br from-cyan-500/25 to-sky-500/10 sm:h-60 md:h-64">
                  <span className="text-6xl font-black text-white/30">{title.charAt(0)}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 sm:gap-3">
                {[
                  { label: "Read Duration", value: `${readMinutes} mins` },
                  { label: "Content Sections", value: structuredSections > 0 ? `${structuredSections}` : "Structured" },
                  { label: "Category", value: category },
                  { label: "Publishing", value: "Career-First Insights" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm sm:p-4">
                    <p className="text-xl font-black leading-none">{item.value}</p>
                    <p className="mt-1 text-[11px] text-white/75">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <article className="py-8 sm:py-10 md:py-14">
        <div className="container max-w-5xl">
          {isLoading ? (
            <div className="rounded-2xl border bg-card/70 p-6 text-sm text-muted-foreground sm:p-8">Loading article...</div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-8"
              >
                <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10 p-4 sm:mb-8 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Article Summary</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{excerpt}</p>
                </div>

                {dbPost
                  ? dbPost.contentBlocks.length
                    ? renderStyledBlocks(dbPost.contentBlocks)
                    : renderMarkdownContent(dbPost.content)
                  : (
                      <div className="space-y-6 sm:space-y-7">
                        {fallbackPost?.content.map((paragraph, i) => (
                          <p key={i} className="text-[15px] leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                className="mt-6 rounded-2xl border bg-gradient-to-r from-accent/25 via-background to-accent/20 p-5 sm:mt-8 sm:p-7"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Next Step</p>
                <h2 className="mt-2 text-2xl font-heading font-black text-foreground sm:text-3xl">
                  Apply This Learning In Real Projects
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  Explore our role-focused programs to convert insights into practical implementation, portfolio-ready project work, and interview confidence.
                </p>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <Link
                    to="/programs"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    Explore Programs <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/blog"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
                  >
                    <BookOpenText className="h-4 w-4" /> Read More Articles
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </article>

      <PublicLongformContent variant="blog-post" />

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default BlogPost;
