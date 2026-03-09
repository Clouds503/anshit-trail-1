import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  variant?: "default" | "programs";
}

const PageHero = ({ title, subtitle, imageUrl, variant = "default" }: PageHeroProps) => {
  if (!imageUrl && variant === "programs") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400" />

        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Large gradient orbs */}
          <motion.div 
            className="hidden sm:block absolute top-10 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"
            animate={{ y: [0, 80, 0], x: [0, 40, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="hidden sm:block absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl"
            animate={{ y: [0, -80, 0], x: [0, -40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="hidden md:block absolute top-1/2 right-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Geometric shapes */}
          <motion.div 
            className="hidden lg:block absolute top-20 left-10 w-20 h-20 border-2 border-white/10 rounded-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="hidden lg:block absolute bottom-32 right-16 w-32 h-32 border-2 border-white/5 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)",
            backgroundSize: "100px 100px"
          }} />

          {/* Diagonal stripes */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255, 255, 255, .1) 35px, rgba(255, 255, 255, .1) 70px)"
          }} />
        </div>

        {/* Content */}
        <div className="relative py-16 md:py-24 lg:py-40 min-h-[auto] md:min-h-[500px] flex items-center">
          <div className="container max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left side - Text content */}
              <motion.div
                className="space-y-4 md:space-y-6"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/15 border border-white/30 backdrop-blur-md"
                >
                  <motion.span 
                    className="h-2.5 w-2.5 rounded-full bg-yellow-300"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <p className="text-sm font-bold text-white uppercase tracking-wider">Industry-Leading Education</p>
                </motion.div>

                {/* Main heading */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2 md:space-y-4"
                >
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-black text-white leading-tight">
                    {title}
                  </h1>
                  <div className="h-1 md:h-1.5 w-16 md:w-24 bg-gradient-to-r from-yellow-300 via-orange-300 to-rose-300" />
                </motion.div>

                {/* Subtitle */}
                {subtitle && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 leading-relaxed max-w-xl"
                  >
                    {subtitle}
                  </motion.p>
                )}

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 md:pt-6"
                >
                  <button 
                    onClick={() => {
                      const programsSection = document.getElementById('programs-section');
                      if (programsSection) {
                        programsSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="group relative px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg bg-white text-blue-600 font-bold overflow-hidden transition-all hover:shadow-2xl hover:scale-105 text-sm sm:text-base"
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-300 -z-10"
                      animate={{ x: [0, 100, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    Explore Programs
                  </button>
                  <a href="https://wa.me/919225998397" target="_blank" rel="noopener noreferrer" className="group">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg bg-white/15 text-white font-bold border border-white/30 hover:bg-white/25 transition-all backdrop-blur-md flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base">
                      Learn More <ArrowRight className="w-4 h-4" />
                    </button>
                  </a>
                </motion.div>
              </motion.div>

              {/* Right side - Visual elements */}
              <motion.div
                className="hidden lg:block relative h-96 md:h-[500px]"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Floating cards */}
                <motion.div 
                  className="absolute top-0 right-0 w-44 sm:w-48 p-4 md:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="text-3xl md:text-4xl mb-2">📚</div>
                  <p className="text-white/80 text-xs md:text-sm font-semibold">50+</p>
                  <p className="text-white text-xs">Courses</p>
                </motion.div>

                <motion.div 
                  className="absolute top-32 right-56 w-44 sm:w-48 p-4 md:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl"
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                >
                  <div className="text-3xl md:text-4xl mb-2">👥</div>
                  <p className="text-white/80 text-xs md:text-sm font-semibold">40K+</p>
                  <p className="text-white text-xs">Students Trained</p>
                </motion.div>

                <motion.div 
                  className="absolute bottom-20 right-10 w-44 sm:w-48 p-4 md:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                >
                  <div className="text-3xl md:text-4xl mb-2">🎯</div>
                  <p className="text-white/80 text-xs md:text-sm font-semibold">100%</p>
                  <p className="text-white text-xs">Placement Assistance</p>
                </motion.div>

                {/* Background shape */}
                <div className="absolute inset-0 rounded-3xl border-2 border-white/10 opacity-50" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="bg-accent py-14 md:py-20">
        <div className="container text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-2">
            {title}
          </motion.h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[280px] md:h-[340px] overflow-hidden">
      <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-foreground/60" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-2">
            {title}
          </motion.h1>
          {subtitle && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white/70 text-lg">{subtitle}</motion.p>}
        </div>
      </div>
    </div>
  );
};

export default PageHero;
