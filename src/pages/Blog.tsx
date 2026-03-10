import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import PublicLongformContent from "@/components/PublicLongformContent";
import { blogPosts } from "@/data/blogPosts";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/image-optimizer";

type BlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const parseNewlyArrivedLimit = (value: unknown) => {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = parsed.trim();
    }
  }
  const num = Number(parsed);
  return num === 5 ? 5 : 6;
};

const Blog = () => {
  const queryClient = useQueryClient();
  const [activeSlide, setActiveSlide] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const { data: dbPosts } = useQuery({
    queryKey: ["blog_posts_page"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("slug,title,excerpt,category,image_url,created_at,is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (!data?.length) return null;
      return data.map((row: any) => ({
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt || "Read full article",
        category: row.category || "General",
        image: row.image_url || "",
        date: formatDate(row.created_at),
      })) as BlogCard[];
    },
  });

  const { data: newlyArrivedLimit = 6 } = useQuery({
    queryKey: ["blog_newly_arrived_limit"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "blog_newly_arrived_limit")
        .maybeSingle();
      return parseNewlyArrivedLimit(data?.value);
    },
  });

  const fallback: BlogCard[] = blogPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    image: post.image,
    date: post.date,
  }));

  const posts = dbPosts?.length ? dbPosts : fallback;
  const newlyArrivedPosts = useMemo(() => posts.slice(0, newlyArrivedLimit), [posts, newlyArrivedLimit]);
  const moreBlogs = useMemo(() => posts.slice(newlyArrivedLimit), [posts, newlyArrivedLimit]);
  const featuredCategories = useMemo(
    () => Array.from(new Set(posts.map((post) => post.category))).slice(0, 5),
    [posts],
  );

  const goNext = () => {
    if (newlyArrivedPosts.length < 2) return;
    setDirection(1);
    setActiveSlide((current) => (current + 1) % newlyArrivedPosts.length);
  };

  const goPrev = () => {
    if (newlyArrivedPosts.length < 2) return;
    setDirection(-1);
    setActiveSlide((current) => (current - 1 + newlyArrivedPosts.length) % newlyArrivedPosts.length);
  };

  const goToSlide = (index: number) => {
    if (newlyArrivedPosts.length < 2) return;
    setDirection(index > activeSlide ? 1 : -1);
    setActiveSlide(index);
  };

  const sliderCards = useMemo(() => {
    const total = newlyArrivedPosts.length;
    if (total === 0) return [];
    if (total === 1) {
      return [{ ...newlyArrivedPosts[0], offset: 0, key: `${newlyArrivedPosts[0].slug}-0` }];
    }
    if (total === 2) {
      const sideIndex = (activeSlide + 1) % total;
      return [
        { ...newlyArrivedPosts[sideIndex], offset: -1, key: `${newlyArrivedPosts[sideIndex].slug}-side` },
        { ...newlyArrivedPosts[activeSlide], offset: 0, key: `${newlyArrivedPosts[activeSlide].slug}-center` },
      ];
    }
    return [-1, 0, 1].map((offset) => {
      const index = (activeSlide + offset + total) % total;
      return {
        ...newlyArrivedPosts[index],
        offset,
        key: `${newlyArrivedPosts[index].slug}-${offset}-${activeSlide}`,
      };
    });
  }, [activeSlide, newlyArrivedPosts]);

  useEffect(() => {
    const channel = supabase
      .channel("public-blogs-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "blogs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["blog_posts_page"] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.blog_newly_arrived_limit" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["blog_newly_arrived_limit"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    setActiveSlide(0);
  }, [newlyArrivedPosts.length]);

  useEffect(() => {
    if (newlyArrivedPosts.length < 2) return;
    const interval = window.setInterval(() => {
      goNext();
    }, 4200);
    return () => window.clearInterval(interval);
  }, [newlyArrivedPosts.length]);

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.35), transparent 40%), radial-gradient(circle at 85% 10%, rgba(14, 165, 233, 0.25), transparent 34%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-20 top-14 hidden h-72 w-72 rounded-full bg-sky-400/20 blur-3xl sm:block"
          animate={{ x: [0, 26, 0], y: [0, -22, 0] }}
          transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-20 bottom-8 hidden h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl sm:block"
          animate={{ x: [0, -20, 0], y: [0, 18, 0] }}
          transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-10 sm:py-16 md:py-20 lg:py-24">
          <div className="grid items-start gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-5"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-xs sm:tracking-[0.22em]">
                <Sparkles className="h-3.5 w-3.5" /> Knowledge Hub
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-5xl lg:text-6xl">
                Insights That Convert Learning Into Career Progress
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-lg md:text-xl">
                Explore practical guides, role-specific explainers, and hands-on implementation insights from Clouds Trail.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {featuredCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 sm:text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-4"
            >
              {[
                { value: `${newlyArrivedPosts.length}`, label: "Newly Arrived Posts" },
                { value: `${moreBlogs.length}`, label: "More Resource Blogs" },
                { value: `${posts.length}`, label: "Published Articles" },
                { value: "Career-First", label: "Practical Learning Focus" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm sm:p-5">
                  <p className="text-base font-black sm:text-2xl">{item.value}</p>
                  <p className="text-[11px] text-white/75 sm:text-sm">{item.label}</p>
                </div>
              ))}
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why These Blogs Matter</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              Clouds Trail is built around career-ready IT programs, and this blog extends that same mission beyond the classroom. Each article connects institute learning with industry expectations, helping learners understand core concepts, project execution standards, and interview-level clarity. Whether you are preparing for Salesforce, Cloud, Data, DevOps, or software roles, these blogs are designed to turn your learning journey into practical, employable skills.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-8 md:pb-12">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex flex-col gap-2.5 sm:mb-8 sm:gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Section 1</p>
              <h2 className="text-2xl font-heading font-black text-foreground sm:text-4xl">Newly Arrived</h2>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                Automatically updated with the latest {newlyArrivedLimit} published blogs. As new articles are added, older entries move into the More Blogs section.
              </p>
            </div>

            <div className="relative h-[410px] overflow-hidden sm:h-[470px] lg:h-[500px]" style={{ perspective: "1400px" }}>
              <AnimatePresence mode="popLayout" custom={direction}>
                {sliderCards.map((post) => {
                  const isCenter = post.offset === 0;
                  return (
                    <div
                      key={post.key}
                      className={`absolute inset-x-0 top-0 flex justify-center ${!isCenter ? "hidden sm:flex" : "flex"}`}
                    >
                      <motion.article
                        className="w-[92vw] max-w-[360px] sm:w-[320px] md:w-[350px] lg:w-[390px]"
                        initial={{
                          opacity: 0,
                          x: direction > 0 ? 360 : -360,
                          rotateY: direction > 0 ? -20 : 20,
                          scale: 0.8,
                        }}
                        animate={{
                          opacity: isCenter ? 1 : 0.55,
                          x: post.offset * 320,
                          rotateY: post.offset * -16,
                          scale: isCenter ? 1 : 0.86,
                          z: isCenter ? 0 : -130,
                        }}
                        exit={{
                          opacity: 0,
                          x: direction > 0 ? -360 : 360,
                          rotateY: direction > 0 ? 20 : -20,
                          scale: 0.8,
                        }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformStyle: "preserve-3d", zIndex: isCenter ? 20 : 10 }}
                      >
                        <Link
                          to={`/blog/${post.slug}`}
                          className={`group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 ${
                            isCenter ? "border-primary/40 shadow-primary/10" : "border-border/70"
                          }`}
                        >
                          <div className="relative h-44 overflow-hidden sm:h-48">
                            {post.image ? (
                              <img
                                src={getOptimizedImageUrl(post.image, { width: 900 })}
                                srcSet={getOptimizedImageSrcSet(post.image)}
                                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 360px, 390px"
                                alt={post.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-4xl font-black text-primary/30">
                                {post.title.charAt(0)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/20 to-transparent" />
                            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                              {post.category}
                            </span>
                          </div>
                          <div className="space-y-3 p-4 sm:p-5">
                            <h3 className="line-clamp-2 text-base font-heading font-bold leading-snug text-foreground sm:text-lg">
                              {post.title}
                            </h3>
                            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">{post.excerpt}</p>
                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {post.date}
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                Read <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.article>
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>

            {newlyArrivedPosts.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2.5 sm:gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-foreground transition hover:bg-accent sm:h-10 sm:w-10"
                  aria-label="Previous blog"
                >
                  <ChevronLeft className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </button>
                <div className="flex items-center gap-1.5 px-1">
                  {newlyArrivedPosts.map((post, index) => (
                    <button
                      key={post.slug}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeSlide ? "w-7 bg-primary" : "w-2 bg-muted-foreground/35"
                      }`}
                      aria-label={`Go to blog ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-foreground transition hover:bg-accent sm:h-10 sm:w-10"
                  aria-label="Next blog"
                >
                  <ChevronRight className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-16 lg:pb-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex flex-col gap-2.5 sm:mb-8 sm:gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Section 2</p>
              <h2 className="text-2xl font-heading font-black text-foreground sm:text-4xl">More Blogs</h2>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                Continue reading the complete archive of practical insights and role-specific guidance.
              </p>
            </div>

            {moreBlogs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3">
                {moreBlogs.map((post, i) => (
                  <motion.article
                    key={post.slug}
                    className="rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.32, delay: i * 0.04 }}
                  >
                    <Link to={`/blog/${post.slug}`} className="block">
                      <div className="relative h-44 overflow-hidden rounded-t-2xl">
                        {post.image ? (
                          <img
                            src={getOptimizedImageUrl(post.image, { width: 800 })}
                            srcSet={getOptimizedImageSrcSet(post.image)}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-4xl font-black text-primary/30">
                            {post.title.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-5">
                        <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {post.category}
                        </span>
                        <h3 className="line-clamp-2 text-lg font-heading font-bold leading-snug text-foreground">{post.title}</h3>
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {post.date}
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-card/50 p-7 text-center">
                <BookOpenText className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  More blogs will appear here as new articles are published in Newly Arrived.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicLongformContent variant="blog" />

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Blog;
