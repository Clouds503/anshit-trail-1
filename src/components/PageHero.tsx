import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

const PageHero = ({ title, subtitle, imageUrl }: PageHeroProps) => {
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
