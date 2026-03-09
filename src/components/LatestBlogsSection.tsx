import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { blogPosts } from "@/data/blogPosts";

type BlogCard = {
  slug: string;
  title: string;
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

const LatestBlogsSection = () => {
  const [blogs, setBlogs] = useState<BlogCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const queryClient = useQueryClient();

  const { data: dbBlogs } = useQuery({
    queryKey: ["latest_blogs_home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("slug,title,category,image_url,created_at,is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!data?.length) return null;
      return data.map((row: any) => ({
        slug: row.slug,
        title: row.title,
        category: row.category || "General",
        image: row.image_url || "",
        date: formatDate(row.created_at),
      })) as BlogCard[];
    },
  });

  const fallback = blogPosts.slice(0, 8).map((post) => ({
    slug: post.slug,
    title: post.title,
    category: post.category,
    image: post.image,
    date: post.date,
  }));

  const latestPosts = dbBlogs?.length ? dbBlogs : fallback;

  useEffect(() => {
    // auto-scroll
    if (latestPosts.length < 2) return;
    const timer = setInterval(() => next(), 3500);
    return () => clearInterval(timer);
  }, [latestPosts.length]);

  const next = useCallback(() => {
    if (latestPosts.length === 0) return;
    setDirection(1);
    setCurrent((c) => (c + 1) % latestPosts.length);
  }, [latestPosts.length]);

  const prev = useCallback(() => {
    if (latestPosts.length === 0) return;
    setDirection(-1);
    setCurrent((c) => (c - 1 + latestPosts.length) % latestPosts.length);
  }, [latestPosts.length]);

  const getVisibleCards = () => {
    if (latestPosts.length === 0) return [];
    const items: (BlogCard & { offset: number })[] = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (current + i + latestPosts.length) % latestPosts.length;
      items.push({ ...latestPosts[idx], offset: i });
    }
    return items;
  };

  useEffect(() => {
    const channel = supabase
      .channel("public-blogs-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "blogs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["latest_blogs_home"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Our Blog</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Latest Insights</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Stay ahead with expert tips, career advice, and industry trends.
          </p>
        </motion.div>

        <div className="relative flex items-center justify-center h-[340px]" style={{ perspective: "1200px" }}>
          <AnimatePresence mode="popLayout" custom={direction}>
            {getVisibleCards().map((post, i) => {
              const isCenter = post.offset === 0;
              const x = post.offset * 280;
              const z = isCenter ? 0 : -120;
              const rotateY = post.offset * -15;
              const scale = isCenter ? 1 : 0.85;
              const opacity = isCenter ? 1 : 0.6;

              return (
                <motion.div
                  key={`${post.slug}-${post.offset}`}
                  className="absolute w-72"
                  initial={{ x: direction > 0 ? 400 : -400, rotateY: direction > 0 ? -30 : 30, opacity: 0, scale: 0.7 }}
                  animate={{ x, rotateY, scale, opacity, z }}
                  exit={{ x: direction > 0 ? -400 : 400, rotateY: direction > 0 ? 30 : -30, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d", zIndex: isCenter ? 10 : 1 }}
                >
                  <div className={`bg-card rounded-xl border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full ${isCenter ? "shadow-primary/20" : ""}`}>
                    <Link to={`/blog/${post.slug}`} className="block">
                      {post.image ? <img src={post.image} alt={post.title} className="w-full h-40 object-cover" loading="lazy" /> : null}
                      <div className="p-5">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-accent px-2 py-1 rounded-full mb-3">
                          {post.category}
                        </span>
                        <h3 className="font-heading font-bold text-foreground text-base mb-2 leading-snug line-clamp-2">{post.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {post.date}
                        </div>
                      </div>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={prev} className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {latestPosts.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <motion.div className="text-center mt-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            View All Articles <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default LatestBlogsSection;
