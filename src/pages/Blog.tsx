import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const Blog = () => {
  const queryClient = useQueryClient();

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

  const fallback: BlogCard[] = blogPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    image: post.image,
    date: post.date,
  }));

  const posts = dbPosts?.length ? dbPosts : fallback;

  useEffect(() => {
    const channel = supabase
      .channel("public-blogs-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "blogs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["blog_posts_page"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <section className="py-10 md:py-20">
        <div className="container">
          <motion.div className="text-center mb-8 md:mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Our Blog</p>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Latest Insights & Resources</h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Stay updated with the latest trends, tips, and career advice in the tech industry.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 max-w-6xl mx-auto">
            {posts.map((post, i) => (
              <motion.article
                key={post.slug}
                className="bg-card rounded-xl border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link to={`/blog/${post.slug}`} className="block">
                  {post.image ? <img src={post.image} alt={post.title} className="w-full h-28 md:h-44 object-cover" loading="lazy" /> : null}
                  <div className="p-3 md:p-6">
                    <span className="inline-block text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-primary bg-accent px-1.5 md:px-2 py-1 rounded-full mb-2 md:mb-3">
                      {post.category}
                    </span>
                    <h2 className="font-heading font-bold text-foreground text-sm md:text-lg mb-1.5 md:mb-2 leading-snug line-clamp-2">{post.title}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 leading-relaxed line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {post.date}
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Blog;
