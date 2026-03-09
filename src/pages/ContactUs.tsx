import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ContactSection from "@/components/ContactSection";
import MarqueeBanner from "@/components/MarqueeBanner";
import SocialLinks from "@/components/SocialLinks";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ContactUs = () => {
  const { data: pageData } = useQuery({
    queryKey: ["contact_page_content"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("page_content")
        .select("page_title,hero_subtitle,hero_image_url")
        .eq("page_slug", "contact")
        .eq("is_active", true)
        .maybeSingle();

      return data || null;
    },
  });

  const { data: contactInfo } = useQuery({
    queryKey: ["contact_info_page"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("contact_info").select("*");
      if (!data) return null;
      const map: Record<string, string> = {};
      data.forEach((row: any) => {
        map[row.key] = row.value;
      });
      return map;
    },
  });

  const pageTitle = `${pageData?.page_title || "Contact Us"}`.trim() || "Contact Us";
  const pageSubtitle =
    `${pageData?.hero_subtitle || "Speak with our team to plan your learning path, clarify program fit, and take the next confident step in your tech career."}`.trim() ||
    "Speak with our team to plan your learning path, clarify program fit, and take the next confident step in your tech career.";
  const heroImage = pageData?.hero_image_url || "";

  const officeAddress = contactInfo?.address || "Noida, Uttar Pradesh, India";
  const phoneNumber = contactInfo?.phone || "+91 99999 99999";
  const emailAddress = contactInfo?.email || "info@cloudstrail.com";

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes"]} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.32), transparent 42%), radial-gradient(circle at 80% 5%, rgba(14, 165, 233, 0.24), transparent 33%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-20 hidden h-72 w-72 rounded-full bg-sky-400/18 blur-3xl sm:block"
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-28 bottom-2 hidden h-80 w-80 rounded-full bg-cyan-300/14 blur-3xl sm:block"
          animate={{ x: [0, -20, 0], y: [0, 22, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-10 sm:py-16 md:py-20 lg:py-24">
          <div className="grid items-start gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-5"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-xs sm:tracking-[0.22em]">
                Get In Touch
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-5xl lg:text-6xl">
                {pageTitle}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-lg md:text-xl">{pageSubtitle}</p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="#contact-form"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById("contact-form");
                    if (element) element.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 sm:w-auto"
                >
                  Send Enquiry <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${phoneNumber.replace(/\s+/g, "")}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/35 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
                >
                  Call Us Now
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-1">
                {[
                  { icon: MapPin, label: "Office", value: officeAddress },
                  { icon: Phone, label: "Phone", value: phoneNumber },
                  { icon: Mail, label: "Email", value: emailAddress },
                  { icon: Clock3, label: "Support", value: "Mon-Sat | 9:30 AM to 7:30 PM" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/15 bg-white/10 p-3.5 sm:p-4">
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <item.icon className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{item.label}</p>
                    <p className="break-words text-sm text-white/90">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {heroImage ? (
          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-32 w-64 overflow-hidden rounded-tl-3xl border-l border-t border-white/20 bg-black/20 md:block">
            <img src={heroImage} alt={pageTitle} className="h-full w-full object-cover opacity-60" loading="lazy" />
          </div>
        ) : null}
      </section>

      <section className="py-8 sm:py-10 md:py-14">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10 p-4 sm:p-7"
          >
            <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              Clouds Trail supports learners, working professionals, and career switchers with role-aligned guidance before enrollment. Use this form to discuss your current background, target role, and preferred learning timeline. Our team will recommend the most suitable program track, explain delivery format, share practical expectations, and help you move forward with a clear plan rather than guesswork.
            </p>
          </motion.div>
        </div>
      </section>

      <section id="contact-form" className="pb-8 md:pb-10">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border bg-card/70 p-4 shadow-sm sm:p-6 md:p-8"
          >
            <div className="mb-4 text-center sm:mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Quick Enquiry</p>
              <h2 className="mt-2 text-2xl font-heading font-extrabold text-foreground sm:text-3xl">
                Tell Us About Your Learning Goal
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Fill in your details and our team will connect with you shortly.
              </p>
            </div>
            <ContactSection
              showSectionHeading={false}
              hideMeta
              embedded
              sourcePage="contact-page"
            />
          </motion.div>
        </div>
      </section>

      <section className="pb-10 md:pb-12">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border bg-gradient-to-r from-accent/25 via-background to-accent/20 p-4 sm:p-7"
          >
            <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              This website is designed to help you make better career decisions with practical clarity. From program details to blog insights, every section is built to reduce confusion and guide action. Once you submit your enquiry, we align your next steps with real job outcomes, project depth, and interview readiness so your learning investment creates measurable career progress.
            </p>
          </motion.div>
          <SocialLinks placement="contact" variant="contact" className="justify-center pt-6" />
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ContactUs;
