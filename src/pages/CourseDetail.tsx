import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Layers3,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import MarqueeBanner from "@/components/MarqueeBanner";
import PublicLongformContent from "@/components/PublicLongformContent";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const fallbackCurriculum: Record<string, string[]> = {
  "cloud-computing": ["Cloud Fundamentals", "AWS EC2, S3, Lambda", "Azure Services & DevOps", "GCP Compute & BigQuery", "Cloud Architecture Patterns", "Terraform & IaC", "Security & Compliance", "Capstone Project"],
  "data-science-ai": ["Python for Data Science", "Statistics & Probability", "Machine Learning Algorithms", "Deep Learning & Neural Networks", "NLP & Computer Vision", "Model Deployment (MLOps)", "Real-world Case Studies", "Capstone Project"],
  "data-engineering": ["SQL & NoSQL Databases", "Apache Spark", "ETL Pipeline Design", "Data Warehousing", "Airflow & Orchestration", "Streaming with Kafka", "Cloud Data Services", "Capstone Project"],
  "cyber-security": ["Network Security", "Ethical Hacking & Penetration Testing", "SOC Operations", "SIEM Tools (Splunk)", "Incident Response", "Compliance & Governance", "Forensics Basics", "Capstone Project"],
  "full-stack-dev": ["HTML, CSS, JavaScript", "React.js & Next.js", "Node.js & Express", "MongoDB & PostgreSQL", "REST APIs & GraphQL", "Auth & Authorization", "Deployment & CI/CD", "Capstone Project"],
  "data-analytics": ["Excel Advanced", "SQL for Analytics", "Power BI Dashboards", "Tableau Visualization", "Python for Analytics", "Statistical Analysis", "Business Intelligence", "Capstone Project"],
  "app-development": ["Dart & Flutter", "React Native", "UI/UX for Mobile", "State Management", "API Integration", "Push Notifications", "App Store Deployment", "Capstone Project"],
  "devops": ["Linux & Shell Scripting", "Docker", "Kubernetes", "CI/CD (Jenkins, GitHub Actions)", "Infrastructure as Code", "Monitoring & Logging", "Cloud DevOps", "Capstone Project"],
  "blockchain": ["Blockchain Fundamentals", "Solidity", "Smart Contracts", "DApp Development", "Web3.js & Ethers.js", "DeFi Protocols", "NFT Development", "Capstone Project"],
};

type ExpandableMobileTextProps = {
  text: string;
  lines?: 2 | 3 | 4;
  className?: string;
};

const clampClassMap: Record<NonNullable<ExpandableMobileTextProps["lines"]>, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

const ExpandableMobileText = ({ text, lines = 3, className = "" }: ExpandableMobileTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowToggle = text.trim().length > 170;
  const mobileClampClass = isExpanded ? "line-clamp-none" : clampClassMap[lines];

  return (
    <div>
      <p className={`${className} ${mobileClampClass} sm:line-clamp-none`}>{text}</p>
      {shouldShowToggle ? (
        <button
          type="button"
          className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-primary sm:hidden"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
};

const CourseDetail = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState<"enrollment" | "syllabus_download" | "counselling" | null>(null);

  const { data: program, isLoading } = useQuery({
    queryKey: ["program", slug],
    queryFn: async () => {
      const { data } = await (supabase as any).from("programs").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!slug) return;
    const channel = supabase
      .channel(`public-program-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "programs", filter: `slug=eq.${slug}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["program", slug] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Course not found</h1>
          <Link to="/programs"><Button variant="outline">View All Programs</Button></Link>
        </div>
      </div>
    );
  }

  // Build curriculum from modules (DB) or fallback
  const modules = program.modules && Array.isArray(program.modules) && program.modules.length > 0 
    ? program.modules 
    : null;
  const flatCurriculum = modules 
    ? modules.map((m: any) => m.title) 
    : (fallbackCurriculum[program.slug] || []);
  const description = program.description || "";
  const highlights = program.highlights || [];
  const shortDescription =
    program.short_description ||
    "Build practical, role-ready capabilities with mentor-led sessions, guided labs, and career-aligned project execution.";
  const parsedPrice = typeof program.price === "number" ? program.price : Number(program.price);
  const shouldShowPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const moduleCount = modules?.length || flatCurriculum.length;
  const topicCount = modules
    ? modules.reduce(
        (count: number, module: any) => count + (Array.isArray(module.topics) ? module.topics.length : 0),
        0,
      )
    : flatCurriculum.length;
  const whatYouGet = [
    "Live instructor-led training with guided doubt support",
    "Hands-on projects mapped to interview expectations",
    "Industry-recognized certificate on successful completion",
    "Placement preparation with resume and mock interview support",
    "Recorded resources and revision assets for long-term access",
    "Flexible weekday and weekend scheduling options",
  ];
  const openSyllabusDownloadForm = () => {
    if (!program.syllabus_url) {
      toast.error("Syllabus is not available for this program yet.");
      return;
    }
    setShowForm("syllabus_download");
  };

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open", "Limited Seats", "100% Placement Assistance", "Live Projects"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 16% 20%, rgba(56, 189, 248, 0.34), transparent 42%), radial-gradient(circle at 82% 12%, rgba(14, 165, 233, 0.26), transparent 34%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-12 hidden h-72 w-72 rounded-full bg-sky-400/20 blur-3xl sm:block"
          animate={{ x: [0, 24, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-20 bottom-8 hidden h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl sm:block"
          animate={{ x: [0, -22, 0], y: [0, 18, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-10 sm:py-14 md:py-18 lg:py-20">
          <Link
            to="/programs"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/15 sm:text-[11px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Programs
          </Link>

          <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-5 sm:space-y-6"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" /> Career Program
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-4xl md:text-5xl">
                {program.title}
              </h1>
              <ExpandableMobileText
                text={shortDescription}
                lines={3}
                className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base md:text-lg"
              />

              <div className="flex flex-wrap gap-2.5">
                {program.duration ? (
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                    {program.duration}
                  </span>
                ) : null}
                {program.level ? (
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                    {program.level}
                  </span>
                ) : null}
                {shouldShowPrice ? (
                  <span className="rounded-full border border-emerald-200/45 bg-emerald-300/15 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                    INR {parsedPrice.toLocaleString("en-IN")}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={() => setShowForm("enrollment")}
                  className="h-11 min-w-[170px] rounded-lg bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-100"
                >
                  <GraduationCap className="mr-2 h-4 w-4" /> Enroll Now
                </Button>
                <Button
                  onClick={openSyllabusDownloadForm}
                  variant="outline"
                  className="h-11 min-w-[170px] rounded-lg border-white/35 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20 hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" /> Download Syllabus
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="space-y-3 sm:space-y-4"
            >
              <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-slate-950/20 backdrop-blur-lg">
                {program.image_url ? (
                  <img
                    src={program.image_url}
                    alt={program.title}
                    className="h-52 w-full object-cover sm:h-60 md:h-64"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-gradient-to-br from-cyan-500/25 to-sky-500/10 sm:h-60 md:h-64">
                    <span className="text-6xl font-black text-white/30">{program.title.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 sm:gap-3">
                {[
                  { icon: Layers3, label: "Learning Modules", value: moduleCount > 0 ? `${moduleCount}` : "8+" },
                  { icon: BookOpen, label: "Key Topics", value: topicCount > 0 ? `${topicCount}+` : "30+" },
                  { icon: Clock3, label: "Program Mode", value: "Live Online" },
                  { icon: Shield, label: "Career Support", value: "Placement Assist" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm sm:p-4">
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <stat.icon className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="text-xl font-black leading-none">{stat.value}</p>
                    <p className="mt-1 text-[11px] text-white/75">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-10 md:py-14 lg:py-16">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <motion.div
              className="order-2 space-y-5 sm:space-y-6 lg:order-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              {description && (
                <motion.section
                  className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-7"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">About This Program</p>
                  <ExpandableMobileText
                    text={description}
                    lines={4}
                    className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8"
                  />
                </motion.section>
              )}

              {modules && modules.length > 0 && (
                <motion.section
                  className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-7"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                >
                  <h2 className="text-2xl font-heading font-black text-foreground sm:text-3xl">Program Modules</h2>
                  <ExpandableMobileText
                    text="Structured, progressive learning blocks designed for practical implementation and interview confidence."
                    lines={2}
                    className="mt-2 text-sm text-muted-foreground sm:text-base"
                  />
                  <div className="mt-5 space-y-3">
                    {modules.map((mod: any, i: number) => (
                      <motion.div
                        key={i}
                        className="rounded-2xl border bg-accent/25 p-4"
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                      >
                        <h3 className="font-heading text-base font-bold text-foreground">
                          Module {i + 1}: {mod.title}
                        </h3>
                        {mod.duration ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                            {mod.duration}
                          </p>
                        ) : null}
                        {mod.topics && Array.isArray(mod.topics) ? (
                          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {mod.topics.map((topic: string, j: number) => (
                              <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground sm:text-sm">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {!modules && flatCurriculum.length > 0 && (
                <motion.section
                  className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-7"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                >
                  <h2 className="text-2xl font-heading font-black text-foreground sm:text-3xl">Curriculum Roadmap</h2>
                  <ExpandableMobileText
                    text="A focused set of modules aligned to current market needs and day-one role expectations."
                    lines={2}
                    className="mt-2 text-sm text-muted-foreground sm:text-base"
                  />
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {flatCurriculum.map((item: string, i: number) => (
                      <motion.div
                        key={item}
                        className="flex items-start gap-2 rounded-xl bg-accent/45 p-3.5"
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm text-foreground">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {highlights.length > 0 && (
                <motion.section
                  className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-7"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                >
                  <h2 className="text-2xl font-heading font-black text-foreground sm:text-3xl">Program Highlights</h2>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground sm:text-base">
                    {highlights.map((item: string) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}

              <motion.section
                className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-7"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <h2 className="text-2xl font-heading font-black text-foreground sm:text-3xl">What You Will Build</h2>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground sm:text-base">
                  {whatYouGet.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section
                className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/25 to-primary/10 p-5 sm:p-7"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-heading text-xl font-black text-foreground">Your Learning Investment Is Protected</h3>
                    <ExpandableMobileText
                      text="We stand behind the quality of our programs with a 7-day money-back assurance. Thousands of learners trust Clouds Trail to build interview-ready confidence and practical delivery skills."
                      lines={3}
                      className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" /> 4.8/5 Student Rating
                      </span>
                      <span className="hidden text-muted-foreground/60 sm:inline">|</span>
                      <span>25,000+ Learners</span>
                      <span className="hidden text-muted-foreground/60 sm:inline">|</span>
                      <span>500+ Hiring Partners</span>
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14 }}
              className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-20 lg:self-start"
            >
              <div className="rounded-3xl border bg-card/95 p-5 shadow-sm sm:p-6">
                <h3 className="font-heading text-xl font-black text-foreground">Get Started</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border bg-accent/30 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Delivery</p>
                      <p className="text-sm font-bold text-foreground">Live Online + Mentorship</p>
                    </div>
                  </div>
                  {shouldShowPrice ? (
                    <div className="rounded-xl border bg-primary/5 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Program Fee</p>
                      <p className="mt-1 text-2xl font-black text-foreground">INR {parsedPrice.toLocaleString("en-IN")}</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2.5">
                  <Button onClick={() => setShowForm("enrollment")} className="h-11 w-full rounded-lg text-sm font-bold">
                    <GraduationCap className="mr-2 h-4 w-4" /> Enroll Now
                  </Button>
                  <Button onClick={openSyllabusDownloadForm} variant="outline" className="h-11 w-full rounded-lg text-sm font-semibold">
                    <Download className="mr-2 h-4 w-4" /> Download Syllabus
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-lg text-sm font-semibold"
                    onClick={() => setShowForm("counselling")}
                  >
                    Get Free Counselling
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-card/80 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Quick Outcomes</p>
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Skill roadmap from fundamentals to interview-level implementation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Mentor guidance for projects, assignments, and practical review
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Career support for resume positioning and role-level preparation
                  </li>
                </ul>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      <PublicLongformContent variant="course-detail" title={`Career roadmap for ${program.title}`} />

      <Footer />
      <WhatsAppButton />

      {showForm && (
        <LeadCaptureForm
          program={program.title}
          leadType={showForm}
          sourcePage={`course/${program.slug}`}
          downloadUrl={showForm === "syllabus_download" ? program.syllabus_url : undefined}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  );
};

export default CourseDetail;

