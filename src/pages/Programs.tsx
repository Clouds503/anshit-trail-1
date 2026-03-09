import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, BookOpen, Users, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import PageHero from "@/components/PageHero";
import BestCoursesSlider from "@/components/BestCoursesSlider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Programs = () => {
  const { data: programs } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: bestCourseIds = [] } = useQuery({
    queryKey: ["best_courses_ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("best_courses")
        .select("program_id")
        .eq("is_active", true);
      return (data || []).map((item: any) => item.program_id);
    },
  });

  const remainingPrograms = (programs || []).filter(
    (p: any) => !bestCourseIds.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes", "Limited Seats"]} />
      <Header />
      <PageHero 
        title="Our Training Programs" 
        subtitle="Explore our complete catalog of industry-aligned certification programs designed to accelerate your career" 
        variant="programs"
      />

      {/* Intro Section */}
      <section className="py-12 md:py-18 lg:py-28 relative overflow-hidden">
        {/* Background decoration */}
        <motion.div 
          className="absolute -top-40 -right-40 w-64 md:w-80 h-64 md:h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-64 md:w-80 h-64 md:h-80 bg-accent/5 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />

        <div className="container max-w-5xl px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8 md:space-y-10"
          >
            <div className="space-y-2 md:space-y-4">
              <p className="text-primary font-bold text-xs sm:text-sm uppercase tracking-widest">Comprehensive Learning Paths</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-black text-foreground leading-tight">Master In-Demand Technology Skills</h2>
              <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed font-light">
                Transform your career with industry-aligned programs designed by experienced practitioners
              </p>
            </div>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
              Clouds Trail offers a comprehensive portfolio of <span className="text-primary font-bold">industry-aligned training programs</span> designed to accelerate your career in technology and business. Our courses span Salesforce administration and development, Workday implementation, Cloud Computing, Data Science & AI, and specialized IT certifications.
            </p>

            <div className="grid grid-cols-2 gap-3 md:gap-6 pt-4">
              <motion.div 
                className="relative p-3 sm:p-5 md:p-7 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/40 group hover:border-accent/70 transition-all overflow-hidden"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-accent/20 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
                <div className="relative space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-accent/40 group-hover:bg-accent/60 transition-colors flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h3 className="font-black text-foreground text-sm md:text-lg">Hands-On Learning</h3>
                  <p className="text-xs md:text-base text-muted-foreground leading-relaxed">
                    Each program combines <span className="font-bold text-primary">hands-on labs</span>, real-world projects, and mentorship from industry experts. We feature <span className="font-bold">best-selling courses</span> meticulously curated based on market demand.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="relative p-3 sm:p-5 md:p-7 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 group hover:border-primary/70 transition-all overflow-hidden"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/20 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
                <div className="relative space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/40 group-hover:bg-primary/60 transition-colors flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-black text-foreground text-sm md:text-lg">Job-Ready Skills</h3>
                  <p className="text-xs md:text-base text-muted-foreground leading-relaxed">
                    Whether mastering Salesforce fundamentals or transitioning to AI/ML and Cloud Architecture, our programs provide <span className="font-bold text-primary">100% placement assistance</span> with job-ready expertise.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Best Courses Slider */}
      <section id="programs-section">
        <BestCoursesSlider showViewAllButton={false} />
      </section>

      {/* Featured Courses Description */}
      <section className="py-10 md:py-14 lg:py-18 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 border-y border-accent/30">
        <div className="container max-w-5xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4 md:space-y-5"
          >
            <div className="inline-flex items-center gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/15 border border-primary/30">
              <span className="h-2 md:h-2.5 w-2 md:w-2.5 rounded-full bg-primary animate-pulse"></span>
              <p className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider">Featured Selection</p>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-black text-foreground leading-tight">Our Best Learning Programs</h3>
            <p className="text-base sm:text-lg md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              The courses below represent our most <span className="font-extrabold text-foreground">sought-after and transformative programs</span>. Selected by thousands of students worldwide, they consistently deliver exceptional career outcomes with <span className="text-primary font-extrabold">average salary increments of 40-60%</span> post-completion.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Remaining Programs */}
      {remainingPrograms.length > 0 && (
        <section className="py-12 md:py-18 lg:py-24 bg-gradient-to-b from-background to-accent/5">
          <div className="container px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10 md:mb-14 max-w-3xl"
            >
              <div className="space-y-2 md:space-y-4 mb-3 md:mb-4">
                <p className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-widest">Specialization Tracks</p>
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-black text-foreground leading-tight">Explore All Programs</h3>
              </div>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">Discover our complete range of specialization tracks, technical modules, and advanced certifications tailored to elevate your expertise and achieve your career goals.</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6">
              {remainingPrograms.map((program: any, i: number) => (
                <Link to={`/course/${program.slug}`} key={program.id}>
                  <motion.div
                    className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="relative h-20 sm:h-24 md:h-32 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                      {program.image_url ? (
                        <img src={program.image_url} alt={program.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/20 text-3xl md:text-4xl font-heading font-bold">{program.title.charAt(0)}</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                      {program.is_trending && (
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-lg">⭐ Trending</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="font-heading font-bold text-foreground text-[11px] sm:text-sm md:text-base lg:text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{program.title}</h3>
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">{program.short_description || "Learn from industry experts"}</p>
                      </div>
                      <div className="pt-3 mt-2 border-t border-border/50">
                        <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-primary inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                          Explore <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-br from-primary/8 via-accent/5 to-primary/3">
        <div className="container max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8 md:space-y-10"
          >
            <div className="space-y-2 md:space-y-3 max-w-2xl">
              <p className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-widest">Our Commitment to Excellence</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-black text-foreground leading-tight">Why Choose Clouds Trail?</h2>
              <p className="text-base md:text-lg text-muted-foreground">We empower your success through industry-aligned education, expert mentorship, and guaranteed career outcomes</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <motion.div 
                className="relative overflow-hidden p-3 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10 border-2 border-blue-200/50 dark:border-blue-800/30 group hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-12 -top-12 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl group-hover:blur-xl transition-all" />
                <div className="relative space-y-2 md:space-y-3">
                  <div className="text-3xl md:text-4xl">🏆</div>
                  <h3 className="font-bold text-foreground text-xs md:text-base lg:text-lg">Practical, Job-Ready Education</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">
                    Every course is designed by industry practitioners who work directly in the technologies they teach, ensuring curriculum relevance to current market demands.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="relative overflow-hidden p-3 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/10 border-2 border-green-200/50 dark:border-green-800/30 group hover:border-green-300 dark:hover:border-green-700 transition-all"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-12 -top-12 w-28 h-28 bg-green-200/20 rounded-full blur-2xl group-hover:blur-xl transition-all" />
                <div className="relative space-y-2 md:space-y-3">
                  <div className="text-3xl md:text-4xl">💼</div>
                  <h3 className="font-bold text-foreground text-xs md:text-base lg:text-lg">Proven Track Record</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">
                    40,000+ trained professionals with 100% placement assistance and a proven track record of successful career transitions across top companies.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="relative overflow-hidden p-3 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/10 border-2 border-purple-200/50 dark:border-purple-800/30 group hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-12 -top-12 w-28 h-28 bg-purple-200/20 rounded-full blur-2xl group-hover:blur-xl transition-all" />
                <div className="relative space-y-2 md:space-y-3">
                  <div className="text-3xl md:text-4xl">🎓</div>
                  <h3 className="font-bold text-foreground text-xs md:text-base lg:text-lg">Hands-On Learning Experience</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">
                    Intensive hands-on labs, capstone projects, and 1-on-1 mentorship from certified professionals. We go beyond theory to build real expertise.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="relative overflow-hidden p-3 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/30 dark:to-orange-950/10 border-2 border-orange-200/50 dark:border-orange-800/30 group hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                whileHover={{ y: -4 }}
              >
                <div className="absolute -right-12 -top-12 w-28 h-28 bg-orange-200/20 rounded-full blur-2xl group-hover:blur-xl transition-all" />
                <div className="relative space-y-2 md:space-y-3">
                  <div className="text-3xl md:text-4xl">🚀</div>
                  <h3 className="font-bold text-foreground text-xs md:text-base lg:text-lg">Lifetime Support & Growth</h3>
                  <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">
                    Lifetime course access, continuous curriculum updates, and a vibrant alumni community for ongoing networking and career advancement.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Programs;
