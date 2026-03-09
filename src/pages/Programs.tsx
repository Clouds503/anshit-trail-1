import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import PageHero from "@/components/PageHero";
import PageSeoContent from "@/components/PageSeoContent";
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

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "100% Placement Assistance", "Free Demo Classes", "Limited Seats"]} />
      <Header />
      <PageHero title="Our Training Programs" subtitle="Explore our complete catalog of industry-aligned certification programs" />

      <section className="py-10 md:py-20">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {(programs || []).map((program: any, i: number) => (
              <Link to={`/course/${program.slug}`} key={program.id}>
                <motion.div
                  className="group bg-card rounded-xl border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer h-full"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div className="relative h-28 md:h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-accent">
                    {program.image_url ? (
                      <img src={program.image_url} alt={program.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30 text-3xl md:text-5xl font-heading font-bold">{program.title.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    {program.is_trending && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3">
                        <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-1 rounded-full bg-primary text-primary-foreground text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Trending</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-5">
                    <h3 className="font-heading font-bold text-foreground text-sm md:text-lg mb-1 line-clamp-2">{program.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">{program.short_description || "Learn from industry experts"}</p>
                    <span className="text-xs md:text-sm font-semibold text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PageSeoContent slug="programs" className="pt-0" />

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Programs;
