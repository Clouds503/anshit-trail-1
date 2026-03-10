import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/image-optimizer";

interface TrainerRow {
  id: string;
  name: string;
  image_url: string | null;
  mastery_program: string;
}

const OurTrainersSection = () => {
  const { data: trainers } = useQuery({
    queryKey: ["home-trainers"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trainers")
        .select("id,name,image_url,mastery_program")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data || []) as TrainerRow[];
    },
  });

  if (!trainers || trainers.length === 0) return null;

  const loop = [...trainers, ...trainers];

  return (
    <section className="py-16 md:py-20 bg-background border-t border-border/60">
      <div className="container">
        <motion.div
          className="text-center mb-9"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Mentor Network</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Our Trainers</h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto mt-3">
            Industry-led trainers guiding learners with project-first teaching and real hiring expectations.
          </p>
        </motion.div>

        <div className="overflow-hidden">
          <div className="flex animate-marquee-left whitespace-nowrap gap-4" style={{ animationDuration: "42s" }}>
            {loop.map((trainer, idx) => (
              <article
                key={`${trainer.id}-${idx}`}
                className="w-[280px] shrink-0 rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-44 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-primary/15 via-accent/30 to-primary/5">
                  {trainer.image_url ? (
                    <img
                      src={getOptimizedImageUrl(trainer.image_url, { width: 640 })}
                      srcSet={getOptimizedImageSrcSet(trainer.image_url, [240, 360, 480, 640, 768])}
                      sizes="280px"
                      alt={trainer.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-heading font-bold text-primary/35">
                      {trainer.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg leading-tight mb-2 truncate">{trainer.name}</h3>
                <p className="text-sm text-muted-foreground whitespace-normal leading-relaxed">
                  <span className="font-semibold text-foreground">Master Of - </span>
                  {trainer.mastery_program}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurTrainersSection;
