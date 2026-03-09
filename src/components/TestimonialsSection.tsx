import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const fallbackTestimonials = [
  { name: "Priya Sharma", role: "Cloud Engineer at Google", content: "Clouds Trail transformed my career. The hands-on projects and placement support helped me land my dream job at Google within 3 months.", rating: 5 },
  { name: "Rahul Verma", role: "Data Scientist at Amazon", content: "The Data Science program was incredibly comprehensive. The mentors were industry veterans who provided real-world insights.", rating: 5 },
  { name: "Anita Desai", role: "Full Stack Dev at Microsoft", content: "I came from a non-tech background. The structured curriculum and supportive community made the transition smooth.", rating: 5 },
  { name: "Vikram Patel", role: "DevOps Engineer at Netflix", content: "Real CI/CD pipelines, Kubernetes hands-on, and mock interviews prepared me perfectly for top-tier companies.", rating: 5 },
  { name: "Sneha Reddy", role: "Security Analyst at Deloitte", content: "Outstanding training in ethical hacking. The lab sessions gave me the confidence to handle real security challenges.", rating: 5 },
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase();

const TestimonialsSection = () => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const { data: testimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await supabase.from("testimonials").select("*").eq("is_active", true).order("sort_order");
      return data && data.length > 0 ? data : null;
    },
  });

  const displayTestimonials = testimonials || fallbackTestimonials;

  useEffect(() => {
    if (!carouselApi || displayTestimonials.length < 2) return;
    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 3500);
    return () => clearInterval(timer);
  }, [carouselApi, displayTestimonials.length]);

  return (
    <section id="testimonials" className="py-16 md:py-24">
      <div className="container">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Success Stories</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Hear From Our Alumni</h2>
        </motion.div>

        <Carousel setApi={setCarouselApi} opts={{ align: "start", loop: true }} className="max-w-5xl mx-auto">
          <CarouselContent>
            {displayTestimonials.map((t, i) => (
              <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                <div className="bg-card rounded-lg border p-6 h-full flex flex-col">
                  <Quote className="h-7 w-7 text-primary/15 mb-3" />
                  <p className="text-foreground/70 text-sm leading-relaxed flex-1 mb-5">"{t.content}"</p>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {getInitials(t.name)}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 md:-left-12" />
          <CarouselNext className="-right-4 md:-right-12" />
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialsSection;
