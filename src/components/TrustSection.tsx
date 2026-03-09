import { Shield, Award, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const defaultPartners = [
  "Google", "Microsoft", "Amazon", "IBM", "Oracle",
  "Cisco", "Infosys", "TCS", "Wipro", "HCL",
  "Accenture", "Deloitte", "Capgemini", "Cognizant",
];

const badges = [
  { icon: Shield, label: "ISO 9001 Certified" },
  { icon: Award, label: "NASSCOM Member" },
  { icon: BadgeCheck, label: "Govt. Recognized" },
];

const TrustSection = () => {
  const { data: partners = defaultPartners } = useQuery({
    queryKey: ["trust_partners"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trust_partners")
        .select("name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const names = (data || []).map((row: any) => row.name).filter(Boolean);
      return names.length ? names : defaultPartners;
    },
  });
  const doubled = [...partners, ...partners];

  return (
    <section className="py-12 border-b bg-background">
      <div className="container">
        {/* Certification badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          {badges.map((b) => (
            <div key={b.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent border border-primary/10">
              <b.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Partner logos marquee */}
        <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wider mb-5">
          Our Students Work At
        </p>
        <div className="overflow-hidden">
          <div className="flex animate-marquee-left whitespace-nowrap">
            {doubled.map((name, i) => (
              <span
                key={i}
                className="mx-6 text-sm font-semibold text-muted-foreground/70 shrink-0"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
