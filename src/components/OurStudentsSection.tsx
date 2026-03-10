import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/image-optimizer";

interface StudentRow {
  id: string;
  name: string;
  image_url: string | null;
  program_name: string;
  status: string;
  status_on: string | null;
  placed_at: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Date pending";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const OurStudentsSection = () => {
  const { data: students } = useQuery({
    queryKey: ["home-students"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id,name,image_url,program_name,status,status_on,placed_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data || []) as StudentRow[];
    },
  });

  if (!students || students.length === 0) return null;

  const loop = [...students, ...students];

  return (
    <section className="py-16 md:py-20 bg-muted/25 border-y border-border/60">
      <div className="container">
        <motion.div
          className="text-center mb-9"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Learner Outcomes</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Our Students</h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto mt-3">
            Real learner journeys from enrollment to completion and placement across top hiring partners.
          </p>
        </motion.div>

        <div className="overflow-hidden">
          <div className="flex animate-marquee-left whitespace-nowrap gap-4" style={{ animationDuration: "48s" }}>
            {loop.map((student, idx) => {
              const completed = `${student.status || ""}`.toLowerCase() === "completed";
              const statusLine = completed ? "Completed -" : "Enrolled In -";
              const statusDateLine = completed ? "Completed On -" : "Enrolled On -";
              return (
                <article
                  key={`${student.id}-${idx}`}
                  className="w-[320px] shrink-0 rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden border bg-accent/30 shrink-0">
                      {student.image_url ? (
                        <img
                          src={getOptimizedImageUrl(student.image_url, { width: 160 })}
                          srcSet={getOptimizedImageSrcSet(student.image_url, [80, 120, 160, 240, 320])}
                          sizes="56px"
                          alt={student.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-heading font-bold text-primary/50">
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-foreground leading-tight truncate">{student.name}</h3>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${completed ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                        {completed ? "Completed" : "Enrolled"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground whitespace-normal leading-relaxed">
                    <p><span className="font-semibold text-foreground">{statusLine} </span>{student.program_name}</p>
                    <p><span className="font-semibold text-foreground">{statusDateLine} </span>{formatDate(student.status_on)}</p>
                    <p><span className="font-semibold text-foreground">Currently Placed At - </span>{student.placed_at || "Placement in progress"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStudentsSection;
