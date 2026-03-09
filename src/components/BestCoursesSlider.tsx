import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BestCourse {
  id: string;
  program_id: string;
  display_order: number;
  program: {
    id: string;
    title: string;
    slug: string;
    image_url: string;
    short_description: string;
    duration: string;
    level: string;
  };
}

const BestCoursesSlider = ({ showViewAllButton = true }: { showViewAllButton?: boolean }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  const { data: bestCourses = [] } = useQuery<BestCourse[]>({
    queryKey: ["best_courses_slider"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("best_courses")
        .select("id, program_id, display_order, program:program_id(id, title, slug, image_url, short_description, duration, level)")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as BestCourse[];
    },
  });

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container || bestCourses.length === 0) return;

    const nextIndex = ((idx % bestCourses.length) + bestCourses.length) % bestCourses.length;
    const cardWidth =
      container.offsetWidth < 640
        ? container.offsetWidth * 0.82
        : container.offsetWidth < 1024
          ? container.offsetWidth * 0.52
          : container.offsetWidth * 0.4;
    const gap = 16;
    const totalWidth = cardWidth + gap;

    container.scrollTo({
      left: nextIndex * totalWidth,
      behavior,
    });
    setCurrentIndex(nextIndex);
  }, [bestCourses.length]);

  const scroll = (direction: "left" | "right") => {
    if (bestCourses.length < 2) return;
    const newIndex =
      direction === "left"
        ? (currentIndex - 1 + bestCourses.length) % bestCourses.length
        : (currentIndex + 1) % bestCourses.length;
    scrollToIndex(newIndex);
  };

  useEffect(() => {
    if (bestCourses.length === 0) return;
    setCurrentIndex((prev) => {
      const normalized = prev % bestCourses.length;
      requestAnimationFrame(() => scrollToIndex(normalized, "auto"));
      return normalized;
    });
  }, [bestCourses.length, scrollToIndex]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (bestCourses.length < 2) return;
    const timer = window.setInterval(() => {
      const next = (currentIndexRef.current + 1) % bestCourses.length;
      scrollToIndex(next);
    }, 3800);

    return () => window.clearInterval(timer);
  }, [bestCourses.length, scrollToIndex]);

  useEffect(() => {
    const onResize = () => scrollToIndex(currentIndex, "auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [currentIndex, scrollToIndex]);

  if (bestCourses.length === 0) return null;

  return (
    <section className="overflow-x-clip py-8 md:py-16 lg:py-24 bg-gradient-to-b from-accent/30 to-background">
      <div className="container px-4 sm:px-6">
        <motion.div
          className="text-center mb-4 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-wider mb-1">Trending</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground">
            <span className="text-foreground">Trending </span>
            <span className="text-primary">Programs</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-2">
            Our most popular programs designed to launch your tech career
          </p>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden">
          {/* Cards Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-2 sm:px-0"
            style={{ scrollBehavior: "smooth" }}
          >
            {bestCourses.map((item, idx) => {
              const program = item.program;
              const isCenter = idx === currentIndex;
              
              return (
                <motion.div
                  key={`${item.id}`}
                  className={`flex-shrink-0 transition-all duration-300 ${
                    isCenter 
                      ? "w-[82vw] sm:w-[65vw] md:w-[48vw] lg:w-[40vw] xl:w-[34vw]"
                      : "w-[70vw] sm:w-[52vw] md:w-[38vw] lg:w-[32vw] xl:w-[28vw] opacity-55"
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  animate={{
                    scale: isCenter ? 1 : 0.85,
                    y: isCenter ? 0 : 10,
                  }}
                >
                  <Link to={`/course/${program.slug}`}>
                    <div className={`group/card relative rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                      isCenter
                        ? "h-72 sm:h-96 md:h-[420px] border-primary/50 shadow-2xl bg-gradient-to-br from-primary/20 to-accent/20"
                        : "h-56 sm:h-64 md:h-72 border-border shadow-lg bg-gradient-to-br from-primary/10 to-accent/10"
                    }`}>
                      {/* Background Image */}
                      <div className="absolute inset-0">
                        {program.image_url ? (
                          <img
                            src={program.image_url}
                            alt={program.title}
                            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <span className="text-6xl sm:text-7xl font-bold text-primary/20">{program.title.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Overlay Gradient */}
                      <div className={`absolute inset-0 transition-opacity duration-300 ${
                        isCenter
                          ? "bg-gradient-to-t from-foreground via-foreground/50 to-transparent opacity-80"
                          : "bg-gradient-to-t from-foreground via-foreground/30 to-transparent opacity-60"
                      }`} />

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-6 text-white">
                        <div className={`space-y-2 transition-all duration-300 ${isCenter ? "md:space-y-3" : ""}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 md:py-1 rounded-full bg-primary/90 text-primary-foreground text-[9px] md:text-xs font-bold uppercase tracking-wider">
                              {program.level}
                            </span>
                            {program.duration && (
                              <span className="text-[10px] md:text-sm font-medium text-white/90">{program.duration}</span>
                            )}
                          </div>

                          <div>
                            <h3 className={`font-heading font-bold mb-1 line-clamp-3 group-hover/card:text-primary transition-colors ${
                              isCenter
                                ? "text-base sm:text-xl md:text-2xl"
                                : "text-sm sm:text-base md:text-lg"
                            }`}>
                              {program.title}
                            </h3>
                            <p className={`text-white/80 line-clamp-2 transition-all ${
                              isCenter
                                ? "text-xs sm:text-sm md:text-base"
                                : "text-[10px] sm:text-xs hidden sm:block line-clamp-1"
                            }`}>
                              {program.short_description}
                            </p>
                          </div>

                          {isCenter && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="pt-2"
                            >
                              <button className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap">
                                Learn More <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          {bestCourses.length > 1 && (
            <>
              <button
                onClick={() => scroll("left")}
                className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>

              <button
                onClick={() => scroll("right")}
                className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </>
          )}
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-2 mt-6 md:mt-8">
          {bestCourses.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-muted-foreground/50 hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        {showViewAllButton && (
          <div className="text-center mt-6 md:mt-8">
            <Link to="/programs">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-xs sm:text-sm px-4 md:px-6 py-2">
                View All Programs
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default BestCoursesSlider;
