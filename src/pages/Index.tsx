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
      <div className={`min-h-screen bg-background ${shouldShowPreloader ? "overflow-hidden h-screen" : ""}`}>
        <MarqueeBanner items={topBannerItems} direction="left" />
        <Header />
        <main>
          <HeroSection />
          <section className="py-8 md:py-10 border-y bg-accent/20">
            <div className="container max-w-6xl">
              <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground mb-3">
                Salesforce and Workday Training at Clouds Trail
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                Clouds Trail is a practical salesforce institute and IT institute focused on job-ready tracks for
                salesforce admin, salesforce developer, sales force fundamentals, salesforce lwc, salesforce omni studio,
                and workday training with mentorship and placement support.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                <Link to="/programs" className="text-sm font-medium text-primary hover:underline">Explore Salesforce Admin Track</Link>
                <Link to="/programs" className="text-sm font-medium text-primary hover:underline">Explore Salesforce Developer Track</Link>
                <Link to="/programs" className="text-sm font-medium text-primary hover:underline">Explore Salesforce LWC Modules</Link>
                <Link to="/programs" className="text-sm font-medium text-primary hover:underline">Explore Salesforce Omni Studio Modules</Link>
                <Link to="/programs" className="text-sm font-medium text-primary hover:underline">Explore Workday Training Programs</Link>
                <Link to="/blog" className="text-sm font-medium text-primary hover:underline">Read Salesforce Career Guides</Link>
                <Link to="/blog" className="text-sm font-medium text-primary hover:underline">Read Workday Learning Guides</Link>
                <Link to="/enroll" className="text-sm font-medium text-primary hover:underline">Enroll in IT Institute Programs</Link>
                <Link to="/about" className="text-sm font-medium text-primary hover:underline">About Clouds Trail Institute</Link>
                <Link to="/contact" className="text-sm font-medium text-primary hover:underline">Contact Clouds Trail Team</Link>
                <Link to="/terms" className="text-sm font-medium text-primary hover:underline">Review Terms and Conditions</Link>
                <Link to="/privacy" className="text-sm font-medium text-primary hover:underline">Review Privacy Policy</Link>
              </div>
            </div>
          </section>
          <TrustSection />
          <StatsSection />
          <TrendingPrograms />
          <ProcessSection />
          <TestimonialsSection />
          <OurTrainersSection />
          <OurStudentsSection />
          <FAQContactSection />
          <LatestBlogsSection />
          <PageSeoContent
            slug="home"
            className="pt-0"
            heroTitle="Launch Your Tech Career with Expert Training"
            excludedHeadings={[
              "trending programs",
              "latest insights",
              "common questions",
              "contact us",
              "ready to start your tech career",
            ]}
            minUsefulWords={760}
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
