import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Program {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  image_url: string;
}

const TrendingPrograms = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("programs").select("*").eq("is_trending", true).eq("is_active", true).order("sort_order");
      if (data && data.length > 0) setPrograms(data);
    })();
  }, []);

  const next = useCallback(() => {
    if (programs.length === 0) return;
    setDirection(1);
    setCurrent((c) => (c + 1) % programs.length);
  }, [programs.length]);

  const prev = useCallback(() => {
    if (programs.length === 0) return;
    setDirection(-1);
    setCurrent((c) => (c - 1 + programs.length) % programs.length);
  }, [programs.length]);

  useEffect(() => {
    if (programs.length < 2) return;
    const timer = setInterval(() => next(), 3500);
    return () => clearInterval(timer);
  }, [programs.length, next]);

  const getVisibleCards = () => {
    if (programs.length === 0) return [];
    const items = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (current + i + programs.length) % programs.length;
      items.push({ ...programs[idx], offset: i });
    }
    return items;
  };

  if (programs.length === 0) return null;

  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-3">
            Trending <span className="text-primary">Programs</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Our most popular programs designed to launch your tech career</p>
        </div>

        <div className="relative flex items-center justify-center h-[340px]" style={{ perspective: "1200px" }}>
          <AnimatePresence mode="popLayout" custom={direction}>
            {getVisibleCards().map((prog) => {
              const isCenter = prog.offset === 0;
              const x = prog.offset * 280;
              const z = isCenter ? 0 : -120;
              const rotateY = prog.offset * -15;
              const scale = isCenter ? 1 : 0.85;
              const opacity = isCenter ? 1 : 0.6;

              return (
                <motion.div
                  key={`${prog.id}-${prog.offset}`}
                  className="absolute w-72"
                  initial={{ x: direction > 0 ? 400 : -400, rotateY: direction > 0 ? -30 : 30, opacity: 0, scale: 0.7 }}
                  animate={{ x, rotateY, scale, opacity, z }}
                  exit={{ x: direction > 0 ? -400 : 400, rotateY: direction > 0 ? 30 : -30, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d", zIndex: isCenter ? 10 : 1 }}
                >
                  <div className={`bg-card border rounded-xl overflow-hidden shadow-lg ${isCenter ? "shadow-primary/20" : ""} transition-shadow`}>
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-accent overflow-hidden">
                      {prog.image_url ? (
                        <img src={prog.image_url} alt={prog.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/40 text-4xl font-heading font-bold">
                          {prog.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading font-bold text-foreground mb-1">{prog.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{prog.short_description}</p>
                      {isCenter && (
                        <Link to={`/course/${prog.slug}`}>
                          <Button size="sm" className="w-full text-xs">
                            Learn More <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={prev} className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {programs.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mt-8">
          <Link to="/programs">
            <Button>
              View More Programs <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TrendingPrograms;
