import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import heroInstitute from "@/assets/hero-institute.webp";
import heroInstitute480 from "@/assets/hero-institute-480.webp";
import heroInstitute768 from "@/assets/hero-institute-768.webp";
import heroInstitute1024 from "@/assets/hero-institute-1024.webp";
import heroSlide2 from "@/assets/hero-slide-2.webp";
import heroSlide2480 from "@/assets/hero-slide-2-480.webp";
import heroSlide2768 from "@/assets/hero-slide-2-768.webp";
import heroSlide21024 from "@/assets/hero-slide-2-1024.webp";
import heroSlide3 from "@/assets/hero-slide-3.webp";
import heroSlide3480 from "@/assets/hero-slide-3-480.webp";
import heroSlide3768 from "@/assets/hero-slide-3-768.webp";
import heroSlide31024 from "@/assets/hero-slide-3-1024.webp";

type HeroMode = "3d" | "slideshow" | "static";

type HeroSlide = {
  image: string;
  title: string;
  subtitle: string;
  srcSet?: string;
};

const highlights = [
  "100% Placement Assistance",
  "500+ Hiring Partners",
  "25,000+ Students Placed",
];

const defaultSlides: HeroSlide[] = [
  {
    image: heroInstitute,
    title: "Launch Your Tech Career",
    subtitle: "with Expert Training",
    srcSet: `${heroInstitute480} 480w, ${heroInstitute768} 768w, ${heroInstitute1024} 1024w`,
  },
  {
    image: heroSlide2,
    title: "95% Placement Rate",
    subtitle: "at Top Companies",
    srcSet: `${heroSlide2480} 480w, ${heroSlide2768} 768w, ${heroSlide21024} 1024w`,
  },
  {
    image: heroSlide3,
    title: "Learn from Industry",
    subtitle: "Experts & Mentors",
    srcSet: `${heroSlide3480} 480w, ${heroSlide3768} 768w, ${heroSlide31024} 1024w`,
  },
];

const HeroSection = () => {
  const [mode, setMode] = useState<HeroMode>("3d");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<HeroSlide[]>(defaultSlides);
  const [programs, setPrograms] = useState<string[]>([]);
  const [heroCarouselApi, setHeroCarouselApi] = useState<CarouselApi>();
  const [whatsappLink, setWhatsappLink] = useState("https://wa.me/919999999999?text=Hi!%20I'm%20interested%20in%20Clouds%20Trail%20courses.");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "whatsapp_link")
        .maybeSingle();
      if (data?.value) {
        try {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setWhatsappLink(val);
        } catch {
          setWhatsappLink(data.value);
        }
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("*").eq("key", "hero_mode").maybeSingle();
      if (data?.value) {
        try {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (["3d", "slideshow", "static"].includes(val)) setMode(val);
        } catch {}
      }
    })();

    (async () => {
      const { data } = await supabase.from("hero_slides").select("*").eq("is_active", true).order("sort_order");
      if (data && data.length > 0) {
        setSlides(
          data.map((s: any) => ({
            image: s.image_url || heroInstitute,
            title: s.title,
            subtitle: s.subtitle || "",
          })),
        );
      }
    })();

    (async () => {
      const { data } = await (supabase as any).from("programs").select("title").eq("is_active", true).order("sort_order");
      if (data) setPrograms(data.map((p: any) => p.title));
    })();
  }, []);

  useEffect(() => {
    if (mode !== "slideshow" || slides.length < 2) return;
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, [mode, slides.length]);

  useEffect(() => {
    if (mode !== "3d" || slides.length < 2 || !heroCarouselApi) return;
    const timer = setInterval(() => heroCarouselApi.scrollNext(), 3200);
    return () => clearInterval(timer);
  }, [heroCarouselApi, mode, slides.length]);

  return (
    <section className="relative bg-background overflow-hidden">
      {mode === "3d" && (
        <div className="container py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <HeroContent programs={programs} />

            {slides.length > 1 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <Carousel setApi={setHeroCarouselApi} opts={{ align: "start", loop: true }} className="w-full max-w-md">
                  <CarouselContent>
                    {slides.map((slide, idx) => (
                      <CarouselItem key={idx} className="basis-[85%]">
                        <div className="relative rounded-2xl overflow-hidden border shadow-xl shadow-primary/20">
                          <img
                            src={slide.image}
                            srcSet={slide.srcSet}
                            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 42vw, 420px"
                            alt={slide.title}
                            className="w-full h-[360px] object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                          <div className="absolute left-4 right-4 bottom-4">
                            <p className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wide">Featured Program</p>
                            <h3 className="text-lg font-heading font-bold text-primary-foreground leading-tight">{slide.title}</h3>
                            {slide.subtitle ? <p className="text-xs text-primary-foreground/80 mt-1">{slide.subtitle}</p> : null}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>

                <motion.div
                  className="absolute -left-2 top-1/4 bg-background border rounded-lg px-3 py-2 shadow-md"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <p className="text-xs font-bold text-foreground">500+</p>
                  <p className="text-[10px] text-muted-foreground">Hiring Partners</p>
                </motion.div>
                <motion.div
                  className="absolute -right-2 bottom-1/4 bg-background border rounded-lg px-3 py-2 shadow-md"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <p className="text-xs font-bold text-foreground">95%</p>
                  <p className="text-[10px] text-muted-foreground">Placement Rate</p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative flex items-center justify-center"
              >
                <motion.img
                  src={slides[0]?.image || heroInstitute}
                  srcSet={slides[0]?.srcSet}
                  sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 520px"
                  alt="Clouds Trail Institute"
                  className="w-full max-w-md rounded-2xl shadow-2xl shadow-primary/20"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -left-2 top-1/4 bg-background border rounded-lg px-3 py-2 shadow-md"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <p className="text-xs font-bold text-foreground">500+</p>
                  <p className="text-[10px] text-muted-foreground">Hiring Partners</p>
                </motion.div>
                <motion.div
                  className="absolute -right-2 bottom-1/4 bg-background border rounded-lg px-3 py-2 shadow-md"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <p className="text-xs font-bold text-foreground">95%</p>
                  <p className="text-[10px] text-muted-foreground">Placement Rate</p>
                </motion.div>
                <motion.div
                  className="absolute right-8 -top-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-md"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                >
                  <p className="text-[10px] font-bold">4.9/5 Rating</p>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {mode === "slideshow" && (
        <div className="relative h-[500px] md:h-[550px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={slides[currentSlide]?.image}
                srcSet={slides[currentSlide]?.srcSet}
                sizes="100vw"
                alt={slides[currentSlide]?.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="absolute inset-0 bg-foreground/60" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 container h-full flex items-center">
            <div className="max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white leading-tight mb-3">
                    {slides[currentSlide]?.title}
                    <br />
                    <span className="text-primary">{slides[currentSlide]?.subtitle}</span>
                  </h2>
                  <p className="text-white/70 text-lg mb-6 max-w-md">
                    Industry-leading certification programs with guaranteed placement support.
                  </p>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="bg-primary text-primary-foreground font-semibold px-8 h-12 rounded-lg">
                      Get Free Counselling <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-primary" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      )}

      {mode === "static" && (
        <div className="relative h-[500px] md:h-[550px]">
          <img
            src={slides[0]?.image || heroInstitute}
            srcSet={slides[0]?.srcSet}
            sizes="100vw"
            alt="Clouds Trail"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-foreground/50" />
          <div className="absolute inset-0 flex items-center">
            <div className="container">
              <div className="max-w-xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white leading-tight mb-3">
                    Launch Your <span className="text-primary">Tech Career</span>
                    <br />
                    with Expert Training
                  </h2>
                  <p className="text-white/70 text-lg mb-6 max-w-md">
                    Industry-leading certification programs with 100% placement support.
                  </p>
                  <ul className="space-y-2 mb-6">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm text-white/90">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> {h}
                      </li>
                    ))}
                  </ul>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="bg-primary text-primary-foreground font-semibold px-8 h-12 rounded-lg">
                      Get Free Counselling <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const HeroContent = ({ programs }: { programs: string[] }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", course: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      program: form.course || "General Enquiry",
      lead_type: "demo_booking",
      source_page: "homepage-hero",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Something went wrong.");
      return;
    }
    const { data: emailData, error: emailError } = await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        program: form.course || "General Enquiry",
        leadType: "demo_booking",
        sourcePage: "homepage-hero",
      },
    });

    if (emailError || (!emailData?.email?.admin?.sent && !emailData?.email?.user?.sent && !emailData?.success)) {
      toast.error("Demo booked, but email delivery failed.");
    } else {
      toast.success("Thank you! We'll contact you for a free demo.");
    }
    setForm({ name: "", email: "", phone: "", course: "" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-5 border border-primary/10">
        Trusted by 25,000+ Students
      </div>
      <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground leading-[1.15] mb-4">
        Launch Your <span className="text-primary">Tech Career</span> with Expert Training
      </h2>
      <p className="text-muted-foreground text-lg mb-5 leading-relaxed max-w-lg">
        Industry-leading certification programs in Salesforce and Workday training with guaranteed placement support from Clouds Trail.
      </p>
      <ul className="space-y-2 mb-6">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2.5 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {h}
          </li>
        ))}
      </ul>
      <div className="bg-card border rounded-lg p-5">
        <p className="font-heading font-bold text-sm text-foreground mb-3">Book Free Demo Class</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={100}
            className="col-span-2 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            maxLength={255}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            maxLength={15}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
            className="col-span-2 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
          >
            <option value="">Select Course (Optional)</option>
            {programs.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={submitting} className="col-span-2 bg-primary text-primary-foreground font-semibold h-10 rounded-lg text-sm">
            {submitting ? "Submitting..." : "Book Free Demo"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default HeroSection;
