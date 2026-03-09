import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle,
  GraduationCap,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureMinimumUsefulWords,
  normalizeSeoContentBlocks,
  type SeoContentBlock,
} from "@/lib/seo-content-normalizer";

type ContentBlock = SeoContentBlock & {
  style?: {
    size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    bold?: boolean;
    underline?: boolean;
  };
};

type AboutPageData = {
  page_title: string;
  hero_subtitle: string;
  content: ContentBlock[];
};

const FALLBACK_PAGE: AboutPageData = {
  page_title: "About Clouds Trail",
  hero_subtitle:
    "Career-first IT training with practical execution, expert mentorship, and placement-focused outcomes.",
  content: [
    {
      type: "paragraph",
      text:
        "Clouds Trail is a practical IT training institute focused on helping learners become job-ready with structured learning paths, real implementation practice, and mentor-driven feedback.",
    },
    {
      type: "paragraph",
      text:
        "Our programs are designed for outcomes, not passive course completion. Every learner follows a roadmap that combines concept clarity, hands-on execution, and interview preparation.",
    },
    {
      type: "list",
      items: [
        "Project-first learning model with practical implementation",
        "Structured mentorship and consistent revision cycles",
        "Career support, interview readiness, and portfolio depth",
        "Industry-aligned curriculum updated for current hiring needs",
      ],
    },
  ],
};

const sizeClassMap: Record<NonNullable<NonNullable<ContentBlock["style"]>["size"]>, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const valueCardTitles = ["Practical Delivery", "Mentor-Led Growth", "Career Outcomes", "Industry Relevance"];

const AboutUs = () => {
  const [page, setPage] = useState<AboutPageData>(FALLBACK_PAGE);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("page_content")
        .select("page_title,hero_subtitle,content,is_active")
        .eq("page_slug", "about")
        .eq("is_active", true)
        .maybeSingle();

      if (!data) {
        return;
      }

      const rawContent = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
      const blocks = normalizeSeoContentBlocks(Array.isArray(rawContent) ? rawContent : [], {
        heroTitle: data.page_title || FALLBACK_PAGE.page_title,
        pageTitle: data.page_title || FALLBACK_PAGE.page_title,
      });
      const enriched = ensureMinimumUsefulWords(blocks, {
        minWords: 760,
        pageLabel: data.page_title || FALLBACK_PAGE.page_title,
        focusTopic: data.hero_subtitle || FALLBACK_PAGE.hero_subtitle,
      }) as ContentBlock[];

      setPage({
        page_title: `${data.page_title || FALLBACK_PAGE.page_title}`.trim() || FALLBACK_PAGE.page_title,
        hero_subtitle: `${data.hero_subtitle || FALLBACK_PAGE.hero_subtitle}`.trim() || FALLBACK_PAGE.hero_subtitle,
        content: enriched.length ? enriched : FALLBACK_PAGE.content,
      });
    })();
  }, []);

  const paragraphBlocks = useMemo(
    () => page.content.filter((block) => block.type === "paragraph" && block.text),
    [page.content],
  );

  const missionParagraphs = useMemo(() => {
    const selected = paragraphBlocks.slice(0, 2);
    return selected.length ? selected : FALLBACK_PAGE.content.filter((block) => block.type === "paragraph");
  }, [paragraphBlocks]);

  const storyParagraphs = useMemo(() => {
    const selected = paragraphBlocks.slice(2, 5);
    return selected.length ? selected : paragraphBlocks.slice(0, 3);
  }, [paragraphBlocks]);

  const valueCards = useMemo(() => {
    const firstList = page.content.find((block) => block.type === "list" && (block.items || []).length > 0);
    const defaults = [
      "Practical hands-on learning that mirrors real project workflows",
      "Expert-led mentorship focused on role-specific execution",
      "Placement-oriented preparation with interview and portfolio support",
      "Structured growth path for beginners and working professionals",
    ];
    const source = (firstList?.items?.length ? firstList.items : defaults).slice(0, 4);
    const icons = [BookOpen, Users, BriefcaseBusiness, GraduationCap];

    return source.map((text, index) => ({
      text,
      title: valueCardTitles[index] || `Value ${index + 1}`,
      Icon: icons[index % icons.length],
    }));
  }, [page.content]);

  const detailBlocks = useMemo(() => {
    const trimmed = page.content.slice(3, 24);
    return trimmed.length ? trimmed : page.content;
  }, [page.content]);

  const contentWordCount = useMemo(() => {
    return detailBlocks.reduce((count, block) => {
      if (block.type === "paragraph" && block.text) {
        return count + block.text.trim().split(/\s+/).length;
      }
      if ((block.type === "heading" || block.type === "subheading") && block.text) {
        return count + block.text.trim().split(/\s+/).length;
      }
      if (block.type === "list" && (block.items || []).length) {
        return count + (block.items || []).join(" ").trim().split(/\s+/).length;
      }
      return count;
    }, 0);
  }, [detailBlocks]);

  const estimatedReadMinutes = Math.max(3, Math.round(contentWordCount / 190));

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Live Projects", "Mentor Support"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 text-white">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.3), transparent 45%), radial-gradient(circle at 80% 0%, rgba(14, 165, 233, 0.25), transparent 35%)",
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <motion.div
          className="pointer-events-none absolute -left-24 top-20 hidden h-72 w-72 rounded-full bg-sky-400/15 blur-3xl md:block"
          animate={{ x: [0, 28, 0], y: [0, -22, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-24 bottom-0 hidden h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl md:block"
          animate={{ x: [0, -24, 0], y: [0, 18, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-12 sm:py-14 md:py-20 lg:py-24">
          <div className="grid items-start gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-5 sm:space-y-6"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:px-4 sm:text-xs sm:tracking-[0.22em]">
                Built For Career Outcomes
              </p>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="max-w-3xl text-3xl font-heading font-black leading-tight sm:text-5xl lg:text-6xl">
                  {page.page_title}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-lg md:text-xl">
                  {page.hero_subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/programs"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 sm:w-auto"
                >
                  Explore Programs <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/35 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
                >
                  Speak With Team
                </Link>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-100/90 sm:text-xs sm:tracking-[0.2em]">Learning Experience Blueprint</p>
              <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                {valueCards.slice(0, 3).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="relative flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="text-sm leading-relaxed text-white/75">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3 md:grid-cols-4 md:gap-4">
            {[
              { label: "Learners Trained", value: "25K+" },
              { label: "Hiring Partners", value: "500+" },
              { label: "Placement Assistance", value: "100%" },
              { label: "Project-Led Delivery", value: "Real" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm sm:p-4"
              >
                <p className="text-lg font-black sm:text-2xl">{item.value}</p>
                <p className="text-[11px] text-white/75 sm:text-sm">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 lg:py-20">
        <div className="container max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="space-y-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">What Drives Us</p>
              <h2 className="max-w-xl text-3xl font-heading font-extrabold leading-tight text-foreground sm:text-4xl">
                A focused team building real career momentum for every learner.
              </h2>
              {missionParagraphs.map((block, index) => (
                <p
                  key={`${block.text}-${index}`}
                  className="max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[16px] sm:leading-8"
                >
                  {block.text}
                </p>
              ))}

              <div className="rounded-2xl border border-primary/25 bg-accent/40 p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground">
                  We combine curriculum depth, mentor accountability, and interview preparation into one consistent system.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {valueCards.map((item, index) => (
                <motion.div
                  key={`${item.title}-${index}`}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.34, delay: index * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
                >
                  <item.Icon className="mb-4 h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="text-base font-bold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-slate-50/70 py-12 md:py-16 lg:py-20">
        <div className="container max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="space-y-4"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Our Approach</p>
              <h2 className="max-w-2xl text-3xl font-heading font-extrabold leading-tight text-foreground sm:text-4xl">
                From clarity to confidence, every stage is intentionally structured.
              </h2>
              {storyParagraphs.map((block, index) => (
                <p
                  key={`${block.text}-${index}`}
                  className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-[16px] sm:leading-8"
                >
                  {block.text}
                </p>
              ))}
            </motion.div>

            <div className="space-y-3 rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
              {[
                {
                  title: "Foundation",
                  text: "Build strong conceptual understanding before entering project execution.",
                },
                {
                  title: "Execution",
                  text: "Practice in guided labs and capstone workflows that mirror real teams.",
                },
                {
                  title: "Career Transition",
                  text: "Get interview support, portfolio refinement, and role-focused preparation.",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/15 via-transparent to-transparent" />
        <div className="container relative max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-6 rounded-2xl border bg-background/80 p-5 backdrop-blur-sm sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Deep Dive</p>
            <h2 className="mt-2 text-2xl font-heading font-extrabold leading-tight text-foreground sm:text-3xl">
              Detailed Insight Into Our Training Philosophy
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Approx. {estimatedReadMinutes} min read
            </p>
          </motion.div>

          <article className="space-y-5 rounded-3xl border bg-card/60 p-5 shadow-sm sm:p-8 md:space-y-6 md:p-10">
            {detailBlocks.map((block, index) => {
              if (block.type === "heading") {
                const size = block.style?.size ? sizeClassMap[block.style.size] : "text-2xl sm:text-3xl";
                return (
                  <motion.h2
                    key={`${block.text}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
                    className={`font-heading font-extrabold tracking-tight text-foreground ${size}`}
                  >
                    {block.text}
                  </motion.h2>
                );
              }

              if (block.type === "subheading") {
                const size = block.style?.size ? sizeClassMap[block.style.size] : "text-lg sm:text-xl";
                return (
                  <motion.h3
                    key={`${block.text}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.32, delay: Math.min(index * 0.02, 0.2) }}
                    className={`font-heading font-bold tracking-tight text-foreground ${size}`}
                  >
                    {block.text}
                  </motion.h3>
                );
              }

              if (block.type === "paragraph") {
                const size = block.style?.size ? sizeClassMap[block.style.size] : "text-[15px] sm:text-[17px]";
                return (
                  <motion.p
                    key={`${block.text}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
                    className={`leading-7 text-muted-foreground sm:leading-8 ${size} ${index === 0 ? "first-letter:mr-1 first-letter:text-2xl first-letter:font-black first-letter:text-foreground sm:first-letter:text-3xl" : ""}`}
                  >
                    {block.text}
                  </motion.p>
                );
              }

              if (block.type === "list" && (block.items || []).length) {
                return (
                  <motion.div
                    key={`list-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  >
                    {(block.items || []).map((item) => (
                      <div key={item} className="flex items-start gap-2 rounded-lg border bg-background p-3 transition hover:border-primary/40">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-sm leading-relaxed text-foreground">{item}</p>
                      </div>
                    ))}
                  </motion.div>
                );
              }

              if (block.type === "image" && block.url) {
                return (
                  <motion.figure
                    key={`image-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
                    className="space-y-2"
                  >
                    <img
                      src={block.url}
                      alt={block.alt || ""}
                      className="max-h-[440px] w-full rounded-2xl border object-cover"
                      loading="lazy"
                    />
                    {block.alt ? <figcaption className="text-xs text-muted-foreground">{block.alt}</figcaption> : null}
                  </motion.figure>
                );
              }

              return null;
            })}
          </article>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="container max-w-4xl">
          <div className="flex flex-col gap-4 rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ready To Start</p>
              <h3 className="mt-2 text-xl font-heading font-extrabold text-foreground sm:text-2xl">
                Build your path with a mentor-guided learning journey.
              </h3>
            </div>
            <Link
              to="/contact"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 sm:w-auto"
            >
              Connect With Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-10 md:pb-12">
        <div className="container max-w-4xl">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-accent/30 via-background to-accent/10 p-5 text-center shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Stay Connected</p>
            <h3 className="mt-2 text-xl font-heading font-extrabold text-foreground sm:text-2xl">Follow Our Learning Community</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Join our updates, student success stories, and practical learning content across platforms.
            </p>
            <SocialLinks placement="about" variant="floating3d" className="pt-5 sm:pt-6 justify-center" />
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default AboutUs;
