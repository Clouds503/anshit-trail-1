import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import MarqueeBanner from "@/components/MarqueeBanner";
import HeroSection from "@/components/HeroSection";
import TrustSection from "@/components/TrustSection";
import StatsSection from "@/components/StatsSection";
import TrendingPrograms from "@/components/TrendingPrograms";
import ProcessSection from "@/components/ProcessSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import OurTrainersSection from "@/components/OurTrainersSection";
import OurStudentsSection from "@/components/OurStudentsSection";
import FAQContactSection from "@/components/FAQContactSection";
import LatestBlogsSection from "@/components/LatestBlogsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Preloader from "@/components/Preloader";
import PageSeoContent from "@/components/PageSeoContent";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const defaultTopBannerItems = [
  "Admissions Open 2026",
  "100% Placement Assistance",
  "Free Demo Classes",
  "Limited Seats",
  "500+ Hiring Partners",
  "25,000+ Students Trained",
];

const homeSeoExcludedHeadings = [
  "trending programs",
  "latest insights",
  "common questions",
  "contact us",
  "ready to start your tech career",
];

const Index = () => {
  const [loading, setLoading] = useState(true);
  const handleLoadComplete = useCallback(() => setLoading(false), []);
  const { data: preloaderEnabled = true, isLoading: preloaderSettingLoading } = useQuery({
    queryKey: ["preloader_enabled"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "preloader_enabled")
        .maybeSingle();

      const raw = data?.value;
      if (typeof raw === "boolean") return raw;

      const text = `${raw ?? ""}`.trim();
      if (!text) return true;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "boolean") return parsed;
        if (typeof parsed === "number") return parsed !== 0;
        if (typeof parsed === "string") {
          const normalized = parsed.toLowerCase();
          if (["true", "1", "yes", "on"].includes(normalized)) return true;
          if (["false", "0", "no", "off"].includes(normalized)) return false;
        }
      } catch {
        const normalized = text.toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) return true;
        if (["false", "0", "no", "off"].includes(normalized)) return false;
      }
      return true;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!preloaderSettingLoading && !preloaderEnabled) {
      setLoading(false);
    }
  }, [preloaderEnabled, preloaderSettingLoading]);

  const shouldShowPreloader = !preloaderSettingLoading && preloaderEnabled && loading;

  const { data: topBannerItems = defaultTopBannerItems } = useQuery({
    queryKey: ["top_banner_items"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("top_banner_items")
        .select("text")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const items = (data || []).map((row: any) => row.text).filter(Boolean);
      return items.length ? items : defaultTopBannerItems;
    },
  });

  return (
    <>
      {shouldShowPreloader && <Preloader onComplete={handleLoadComplete} />}
      <div className={`min-h-screen bg-background overflow-x-hidden ${shouldShowPreloader ? "overflow-hidden h-screen" : ""}`}>
        <MarqueeBanner items={topBannerItems} direction="left" />
        <Header />
        <main>
          <HeroSection />
          <section className="border-y bg-accent/20 py-7 md:py-9">
            <div className="container max-w-6xl">
              <div className="rounded-2xl border bg-background/70 p-4 shadow-sm sm:p-6">
                <h1 className="text-2xl font-heading font-extrabold text-foreground md:text-3xl">
                  Salesforce Administration and Cloud Career Training at Clouds Trail
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  Clouds Trail offers job-ready Salesforce programs and cloud salesforce training built for career growth. Learn through guided projects, mentor-led sessions, and interview-focused preparation across Salesforce, Workday, Cloud, Data, and DevOps tracks with placement support.
                </p>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  Learners who completed our training are currently placed at leading companies, and each program is designed to build practical skills for strong career outcomes.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 md:grid-cols-3">
                  <Link to="/programs" className="text-sm font-medium text-primary hover:underline">
                    Explore Programs
                  </Link>
                  <Link to="/blog" className="text-sm font-medium text-primary hover:underline">
                    Read Career Guides
                  </Link>
                  <Link to="/enroll" className="text-sm font-medium text-primary hover:underline">
                    Enroll in a Program
                  </Link>
                  <Link to="/about" className="text-sm font-medium text-primary hover:underline">
                    About Clouds Trail
                  </Link>
                  <Link to="/contact" className="text-sm font-medium text-primary hover:underline">
                    Contact Our Team
                  </Link>
                  <Link to="/privacy" className="text-sm font-medium text-primary hover:underline">
                    Privacy and Policies
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <PageSeoContent
            slug="home"
            className="py-5 md:py-6"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={homeSeoExcludedHeadings}
            minUsefulWords={520}
            allowedTypes={["heading", "subheading", "paragraph"]}
            segmentIndex={0}
            maxBlocksInSegment={3}
          />
          <TrustSection />
          <StatsSection />
          <PageSeoContent
            slug="home"
            className="py-5 md:py-6"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={homeSeoExcludedHeadings}
            minUsefulWords={520}
            allowedTypes={["heading", "subheading", "paragraph"]}
            segmentIndex={1}
            maxBlocksInSegment={3}
          />
          <TrendingPrograms />
          <ProcessSection />
          <PageSeoContent
            slug="home"
            className="py-5 md:py-6"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={homeSeoExcludedHeadings}
            minUsefulWords={520}
            allowedTypes={["heading", "subheading", "paragraph"]}
            segmentIndex={2}
            maxBlocksInSegment={3}
          />
          <TestimonialsSection />
          <OurTrainersSection />
          <OurStudentsSection />
          <PageSeoContent
            slug="home"
            className="py-5 md:py-6"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={homeSeoExcludedHeadings}
            minUsefulWords={520}
            allowedTypes={["heading", "subheading", "paragraph"]}
            segmentIndex={3}
            maxBlocksInSegment={3}
          />
          <FAQContactSection />
          <LatestBlogsSection />
          <PageSeoContent
            slug="home"
            className="py-5 md:py-6"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={homeSeoExcludedHeadings}
            minUsefulWords={520}
            allowedTypes={["heading", "subheading", "paragraph"]}
            segmentIndex={4}
            maxBlocksInSegment={3}
          />
          <CTASection />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </>
  );
};

export default Index;
