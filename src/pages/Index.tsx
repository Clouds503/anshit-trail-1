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
        <HeroSection />
        <TrustSection />
        <StatsSection />
        <TrendingPrograms />
        <ProcessSection />
        <TestimonialsSection />
        <OurTrainersSection />
        <OurStudentsSection />
        <FAQContactSection />
        <LatestBlogsSection />
        <PageSeoContent slug="home" className="pt-0" />
        <CTASection />
        <Footer />
        <WhatsAppButton />
      </div>
    </>
  );
};

export default Index;
