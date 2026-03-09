import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, CheckCircle2, Download, GraduationCap, Shield, Star } from "lucide-react";
import { motion } from "framer-motion";
import MarqueeBanner from "@/components/MarqueeBanner";
import PublicLongformContent from "@/components/PublicLongformContent";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

const CourseDetail = () => {
  const { slug } = useParams();
  const [showForm, setShowForm] = useState<"enrollment" | "syllabus_download" | "counselling" | null>(null);

  const { data: program, isLoading } = useQuery({
    queryKey: ["program", slug],
    queryFn: async () => {
      const { data } = await (supabase as any).from("programs").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      return data;
    },
  });

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
  const parsedPrice = typeof program.price === "number" ? program.price : Number(program.price);
  const shouldShowPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
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

      <div className="container py-10 md:py-16">
        <Link to="/programs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Programs
        </Link>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {program.image_url && (
              <div className="rounded-xl overflow-hidden mb-6 border">
                <img src={program.image_url} alt={program.title} className="w-full h-48 md:h-64 object-cover" />
              </div>
            )}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground">{program.title}</h1>
              {program.short_description && <p className="text-muted-foreground text-sm mt-1">{program.short_description}</p>}
              <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                {program.duration && <span className="bg-accent px-2 py-0.5 rounded text-xs">{program.duration}</span>}
                {program.level && <span className="bg-accent px-2 py-0.5 rounded text-xs">{program.level}</span>}
              </div>
            </div>

            {/* About This Program */}
            {description && (
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h2 className="font-heading font-bold text-foreground mb-4">About This Program</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            {/* Modules (from syllabus) */}
            {modules && modules.length > 0 && (
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h2 className="font-heading font-bold text-foreground mb-5">Program Modules</h2>
                <div className="space-y-4">
                  {modules.map((mod: any, i: number) => (
                    <motion.div key={i} className="border rounded-lg p-4 bg-accent/30" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <h3 className="font-heading font-bold text-foreground text-sm mb-2">Module {i + 1}: {mod.title}</h3>
                      {mod.duration && <p className="text-xs text-primary mb-2">{mod.duration}</p>}
                      {mod.topics && Array.isArray(mod.topics) && (
                        <ul className="grid sm:grid-cols-2 gap-1.5">
                          {mod.topics.map((topic: string, j: number) => (
                            <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> {topic}
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Flat Curriculum fallback */}
            {!modules && flatCurriculum.length > 0 && (
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h2 className="font-heading font-bold text-foreground mb-5">Curriculum</h2>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {flatCurriculum.map((item: string, i: number) => (
                    <motion.div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h2 className="font-heading font-bold text-foreground mb-4">Program Highlights</h2>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {highlights.map((item: string) => (
                    <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-card rounded-lg border p-6 mb-6">
              <h2 className="font-heading font-bold text-foreground mb-4">What You'll Get</h2>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {["Live instructor-led training", "Hands-on real-world projects", "Industry-recognized certification", "100% Placement assistance", "Lifetime access to materials", "Weekend & weekday batches"].map((item) => (
                  <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {item}</li>
                ))}
              </ul>
            </div>

            {/* Trust Section */}
            <div className="bg-accent/30 rounded-lg border border-primary/10 p-6">
              <div className="flex items-start gap-3 mb-3">
                <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">Your Investment is Protected</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We stand behind the quality of our programs with a 7-day money-back guarantee. Over 25,000 students have trusted Clouds Trail to launch their tech careers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pl-9">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> 4.8/5 Rating
                </div>
                <div className="text-xs text-muted-foreground">|</div>
                <div className="text-xs text-muted-foreground">25,000+ Alumni</div>
                <div className="text-xs text-muted-foreground">|</div>
                <div className="text-xs text-muted-foreground">500+ Hiring Partners</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-card rounded-lg border p-6 sticky top-20 space-y-4">
              <h3 className="font-heading font-bold text-foreground">Get Started</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><BookOpen className="h-4 w-4 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Mode</p><p className="font-semibold text-foreground text-sm">Online Only</p></div>
              </div>
              {shouldShowPrice && (
                <div className="text-xl font-bold text-foreground">INR {parsedPrice.toLocaleString("en-IN")}</div>
              )}

              <Button onClick={() => setShowForm("enrollment")} className="w-full bg-primary text-primary-foreground font-semibold h-11 rounded-lg">
                <GraduationCap className="mr-2 h-4 w-4" /> Enroll Now
              </Button>
              <Button onClick={openSyllabusDownloadForm} variant="outline" className="w-full h-11 rounded-lg">
                <Download className="mr-2 h-4 w-4" /> Download Syllabus
              </Button>
              <Button variant="outline" className="w-full h-11 rounded-lg" onClick={() => setShowForm("counselling")}>
                Get Free Counselling
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

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

