import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ProgramsSection = () => {
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("programs").select("*").eq("is_active", true).eq("is_trending", true).order("sort_order").limit(6);
      if (data) setPrograms(data);
    })();
  }, []);

  return (
    <section id="programs" className="py-16 md:py-24">
      <div className="container">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Most Popular</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Trending Programs</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Our most in-demand courses chosen by thousands of students to launch their tech careers.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map((program, i) => (
            <Link to={`/course/${program.slug}`} key={program.id}>
              <motion.div
                className="group bg-card rounded-xl border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/20 to-accent">
                  {program.image_url ? (
                    <img src={program.image_url} alt={program.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/30 text-5xl font-heading font-bold">
                      {program.title.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                      🔥 Trending
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-bold text-foreground mb-0.5">{program.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{program.short_description || "Learn from industry experts"}</p>
                  <span className="text-sm font-semibold text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        <motion.div className="text-center mt-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <Link to="/programs" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
            View All Programs <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ProgramsSection;
