import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ContactSection from "@/components/ContactSection";
import PageHero from "@/components/PageHero";
import MarqueeBanner from "@/components/MarqueeBanner";
import PageSeoContent from "@/components/PageSeoContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ContactUs = () => {
  const [heroImage, setHeroImage] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("page_content").select("hero_image_url").eq("page_slug", "contact").maybeSingle();
      if (data?.hero_image_url) setHeroImage(data.hero_image_url);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />
      <PageHero title="Contact Us" subtitle="Get in touch with our team" imageUrl={heroImage} />
      <ContactSection />
      <PageSeoContent slug="contact" className="pt-2" />
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ContactUs;
