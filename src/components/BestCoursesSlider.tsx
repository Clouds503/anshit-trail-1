import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
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

  const { data: bestCourses = [] } = useQuery({
    queryKey: ["best_courses_slider"],
    queryFn: async () => {
      const { data } = await supabase
        .from("best_courses")
        .select("id, program_id, display_order, program:program_id(id, title, slug, image_url, short_description, duration, level)")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return (data as any) || [];
    },
  });

  const scroll = (direction: "left" | "right") => {
    const newIndex = direction === "left" 
      ? Math.max(0, currentIndex - 1)
      : Math.min(bestCourses.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth < 768 
        ? container.offsetWidth * 0.85 
        : container.offsetWidth * 0.45;
      const gap = 16;
      const totalWidth = cardWidth + gap;
      
      container.scrollTo({
        left: newIndex * totalWidth,
        behavior: "smooth",
      });
    }
  };

  if (bestCourses.length === 0) return null;

  return (
    <section className="py-8 md:py-16 lg:py-24 bg-gradient-to-b from-accent/30 to-background">
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
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-6 sm:px-0"
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
                      ? "w-full sm:w-96 md:w-[420px]" 
                      : "w-56 sm:w-72 md:w-80 opacity-40 hidden sm:block"
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  animate={{
                    scale: isCenter ? 1 : 0.85,
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
                disabled={currentIndex === 0}
                className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>

              <button
                onClick={() => scroll("right")}
                disabled={currentIndex === bestCourses.length - 1}
                className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => {
                setCurrentIndex(idx);
                if (scrollContainerRef.current) {
                  const container = scrollContainerRef.current;
                  const cardWidth = container.offsetWidth < 768 
                    ? container.offsetWidth * 0.85 
                    : container.offsetWidth * 0.45;
                  const gap = 16;
                  const totalWidth = cardWidth + gap;
                  
                  container.scrollTo({
                    left: idx * totalWidth,
                    behavior: "smooth",
                  });
                }
              }}
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
