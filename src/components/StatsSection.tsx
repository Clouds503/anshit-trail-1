import { motion, useInView } from "framer-motion";
import { Users, BookOpen, Award, Building2, GraduationCap, Briefcase } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, BookOpen, Award, Building2, GraduationCap, Briefcase,
};

const fallbackStats = [
  { icon: "Users", value: 25000, suffix: "+", label: "Students Trained" },
  { icon: "BookOpen", value: 400, suffix: "+", label: "Courses Available" },
  { icon: "Award", value: 300, suffix: "+", label: "Industry Experts" },
  { icon: "Building2", value: 500, suffix: "+", label: "Hiring Partners" },
];

const AnimatedCounter = ({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setCount(0);
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

const StatsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await supabase.from("stats").select("*").order("sort_order");
      return data && data.length > 0 ? data : null;
    },
  });

  const displayStats = stats || fallbackStats;

  return (
    <section className="py-16 section-alt" ref={ref}>
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, i) => {
            const Icon = iconMap[stat.icon] || Users;
            return (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix || "+"} inView={inView} />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
