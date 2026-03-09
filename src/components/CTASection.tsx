import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const [whatsappLink, setWhatsappLink] = useState("https://wa.me/919999999999?text=Hi!%20I'm%20interested%20in%20Clouds%20Trail%20courses.");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "whatsapp_link")
        .maybeSingle();
      if (data?.value) {
        try { setWhatsappLink(typeof data.value === "string" ? JSON.parse(data.value) : data.value); } catch { setWhatsappLink(data.value); }
      }
    })();
  }, []);

  return (
    <section className="gradient-hero py-16 md:py-20">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-primary-foreground mb-4">
            Ready to Start Your Tech Career?
          </h2>
          <p className="text-primary-foreground/60 text-lg max-w-lg mx-auto mb-8">
            Book a free counselling session with our experts and find the right course for you.
          </p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-primary text-primary-foreground font-semibold px-8 h-12 rounded-lg shadow-sm">
              Book Free Counselling <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
