import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppButton = () => {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const keys = ["whatsapp_link", "whatsapp_visible", "whatsapp_position"];
      const { data } = await (supabase as any).from("site_settings").select("*").in("key", keys);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((d: any) => {
          try { map[d.key] = typeof d.value === "string" ? JSON.parse(d.value) : d.value; } catch { map[d.key] = d.value; }
        });
        setConfig(map);
      }
    })();
  }, []);

  // Default to visible if not configured
  const visible = config?.whatsapp_visible !== false && config?.whatsapp_visible !== "false";
  if (!visible) return null;

  const link = config?.whatsapp_link || "https://wa.me/919999999999?text=Hi!%20I'm%20interested%20in%20Clouds%20Trail%20courses.";
  const position = config?.whatsapp_position || "bottom-right";

  const posClasses: Record<string, string> = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-20 right-6",
    "top-left": "top-20 left-6",
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${posClasses[position] || posClasses["bottom-right"]} z-50 w-14 h-14 rounded-full bg-[hsl(142,70%,45%)] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform`}
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.156-1.962A15.93 15.93 0 0016.004 32C24.826 32 32 24.822 32 16.004 32 7.176 24.826 0 16.004 0zm9.31 22.606c-.39 1.1-2.282 2.108-3.146 2.182-.864.074-1.67.388-5.622-1.17-4.756-1.876-7.772-6.756-8.004-7.07-.234-.314-1.908-2.538-1.908-4.842 0-2.304 1.208-3.438 1.636-3.91.428-.47.936-.588 1.248-.588.312 0 .624.002.898.016.288.016.674-.11 1.054.804.39.936 1.326 3.24 1.444 3.474.116.234.194.508.038.82-.156.314-.234.508-.468.782-.234.274-.49.612-.702.822-.234.234-.478.488-.206.958.274.47 1.214 2.002 2.606 3.244 1.79 1.594 3.298 2.09 3.768 2.324.47.234.744.196 1.018-.118.274-.314 1.17-1.364 1.482-1.834.312-.47.624-.39 1.054-.234.428.156 2.732 1.288 3.202 1.522.47.234.782.352.898.546.116.196.116 1.132-.274 2.232z"/>
      </svg>
    </a>
  );
};

export default WhatsAppButton;
