import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUser, MessageSquare, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: FileUser,
    step: "1",
    title: "Profile Building",
    bullets: ["ATS-Friendly Resume", "LinkedIn Optimization", "GitHub Portfolio"],
  },
  {
    icon: MessageSquare,
    step: "2",
    title: "Mock Interviews",
    bullets: ["Technical Rounds", "HR Interview Prep", "Interview Strategies"],
  },
  {
    icon: Briefcase,
    step: "3",
    title: "Job Placement",
    bullets: ["Job Mapping", "Interview Scheduling", "Placement Support"],
  },
];

const ProcessSection = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % steps.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + steps.length) % steps.length);
  }, []);

  useEffect(() => {
    if (steps.length < 2) return;
    const timer = setInterval(() => next(), 4000);
    return () => clearInterval(timer);
  }, [next]);

  const getVisibleCards = () => {
    const items: (typeof steps[0] & { offset: number })[] = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (current + i + steps.length) % steps.length;
      items.push({ ...steps[idx], offset: i });
    }
    return items;
  };

  return (
    <section id="placements" className="py-12 md:py-24 section-alt overflow-hidden">
      <div className="container">
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Placement Process</p>
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            Our 3-Step Placement Process
          </h2>
        </motion.div>

        <div className="relative flex items-center justify-center h-[340px]" style={{ perspective: "1200px" }}>
          <AnimatePresence mode="popLayout" custom={direction}>
            {getVisibleCards().map((item) => {
              const isCenter = item.offset === 0;
              const x = item.offset * 280;
              const z = isCenter ? 0 : -120;
              const rotateY = item.offset * -15;
              const scale = isCenter ? 1 : 0.85;
              const opacity = isCenter ? 1 : 0.6;

              return (
                <motion.div
                  key={`${item.title}-${item.offset}`}
                  className="absolute w-72"
                  initial={{ x: direction > 0 ? 400 : -400, rotateY: direction > 0 ? -30 : 30, opacity: 0, scale: 0.7 }}
                  animate={{ x, rotateY, scale, opacity, z }}
                  exit={{ x: direction > 0 ? -400 : 400, rotateY: direction > 0 ? 30 : -30, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d", zIndex: isCenter ? 10 : 1 }}
                >
                  <div className={`bg-card border rounded-xl overflow-hidden shadow-lg ${isCenter ? "shadow-primary/20" : ""} transition-shadow`}>
                    <div className="p-5">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] md:text-xs font-bold">
                        {item.step}
                      </div>
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-accent flex items-center justify-center mx-auto mt-2 md:mt-3 mb-3 md:mb-5">
                        <item.icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground mb-1 text-lg">
                        {item.title}
                      </h3>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {item.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
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
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
