import { CSSProperties } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SocialLinks from "@/components/SocialLinks";

type FooterBrandingSettings = {
  siteTitle: string;
  siteSubtitle: string;
  siteDescription: string;
  footerBio: string;
  footerLogoHeight: number;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(12, Math.min(180, Math.round(parsed)));
};

const fallbackBrandDescription =
  "Clouds Trail is a salesforce institute and IT institute offering Salesforce Admin, Salesforce Developer, sales force basics, Salesforce LWC, Salesforce Omni Studio, and Workday training.";

const Footer = () => {
  const { data: contactInfo } = useQuery({
    queryKey: ["contact_info"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_info").select("*");
      if (!data) return null;
      const map: Record<string, string> = {};
      data.forEach((r) => {
        map[r.key] = r.value;
      });
      return map;
    },
  });

  const { data: footerSections } = useQuery({
    queryKey: ["footer_sections_with_links"],
    queryFn: async () => {
      const { data: sections } = await supabase.from("footer_sections").select("*").eq("is_active", true).order("sort_order");
      if (!sections || sections.length === 0) return null;
      const { data: links } = await supabase.from("footer_links").select("*").eq("is_active", true).order("sort_order");
      return sections.map((s) => ({
        ...s,
        links: (links || []).filter((l) => l.section_id === s.id),
      }));
    },
  });

  const { data: footerBranding } = useQuery({
    queryKey: ["site_branding_footer"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("key,value")
        .in("key", [
          "site_title",
          "site_subtitle",
          "site_description",
          "footer_bio",
          "footer_logo_height",
        ]);

      const map: Record<string, unknown> = {};
      for (const row of data || []) map[`${row.key || ""}`] = row.value;

      return {
        siteTitle: `${map.site_title || "Clouds Trail"}`.trim() || "Clouds Trail",
        siteSubtitle: `${map.site_subtitle || "#1 IT Training Institute"}`.trim() || "#1 IT Training Institute",
        siteDescription: `${map.site_description || fallbackBrandDescription}`.trim() || fallbackBrandDescription,
        footerBio: `${map.footer_bio || fallbackBrandDescription}`.trim() || fallbackBrandDescription,
        footerLogoHeight: parsePositiveInt(map.footer_logo_height, 40),
      } as FooterBrandingSettings;
    },
  });

  const address = contactInfo?.address || "Noida, Uttar Pradesh";
  const phone = contactInfo?.phone || "+91 99999 99999";
  const email = contactInfo?.email || "info@cloudstrail.com";
  const footerCols = footerSections ? Math.max(3, Math.min((footerSections.length || 0) + 2, 6)) : 4;
  const brandTitle = footerBranding?.siteTitle || "Clouds Trail";
  const brandSubtitle = footerBranding?.siteSubtitle || "#1 IT Training Institute";
  const brandDescription = footerBranding?.siteDescription || fallbackBrandDescription;
  const footerBio = footerBranding?.footerBio || brandDescription;
  const footerLogoHeight = footerBranding?.footerLogoHeight || 40;

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container py-10 md:py-14">
        <div
          className="grid grid-cols-2 gap-6 md:gap-10 md:[grid-template-columns:repeat(var(--footer-cols),minmax(0,1fr))]"
          style={{ "--footer-cols": String(footerCols) } as CSSProperties}
        >
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-3 md:mb-4">
              <img
                src={logo}
                alt={brandTitle}
                className="w-auto brightness-0 invert"
                style={{ height: `${footerLogoHeight}px` }}
              />
            </Link>
            <p className="text-secondary-foreground/50 text-[10px] md:text-xs uppercase tracking-wide mb-1.5">
              {brandSubtitle}
            </p>
            <p className="text-secondary-foreground/60 text-xs md:text-sm leading-relaxed max-w-sm">
              {footerBio || brandDescription}
            </p>
          </div>

          {footerSections ? (
            footerSections.map((section) => (
              <div key={section.id}>
                <h4 className="font-heading font-bold text-[10px] md:text-xs uppercase tracking-wider mb-2 md:mb-4 text-secondary-foreground/40">{section.title}</h4>
                <ul className="space-y-1.5 md:space-y-2.5">
                  {section.links.map((link: any) => (
                    <li key={link.id}>
                      <Link
                        to={String(link.label || "").trim().toLowerCase() === "all courses" ? "/programs" : link.url}
                        className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors"
                      >
                        {String(link.label || "").trim().toLowerCase() === "all courses" ? "Programs" : link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              <div>
                <h4 className="font-heading font-bold text-[10px] md:text-xs uppercase tracking-wider mb-2 md:mb-4 text-secondary-foreground/40">Quick Links</h4>
                <ul className="space-y-1.5 md:space-y-2.5">
                  <li><Link to="/about" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">About Us</Link></li>
                  <li><Link to="/programs" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Programs</Link></li>
                  <li><Link to="/contact" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-heading font-bold text-[10px] md:text-xs uppercase tracking-wider mb-2 md:mb-4 text-secondary-foreground/40">Legal</h4>
                <ul className="space-y-1.5 md:space-y-2.5">
                  <li><Link to="/terms" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Terms & Conditions</Link></li>
                  <li><Link to="/privacy" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/refund" className="text-xs md:text-sm text-secondary-foreground/60 hover:text-primary transition-colors">Refund Policy</Link></li>
                </ul>
              </div>
            </>
          )}

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-heading font-bold text-[10px] md:text-xs uppercase tracking-wider mb-2 md:mb-4 text-secondary-foreground/40">Contact</h4>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-2 text-xs md:text-sm text-secondary-foreground/60"><MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 text-primary shrink-0" />{address}</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-secondary-foreground/60"><Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />{phone}</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-secondary-foreground/60"><Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />{email}</li>
            </ul>
            <SocialLinks placement="footer" variant="footer" className="mt-3 md:mt-5" />
          </div>
        </div>
      </div>

      <div className="border-t border-secondary-foreground/10">
        <div className="container py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
          <p className="text-[10px] md:text-xs text-secondary-foreground/30 text-center">(c) 2026 {brandTitle}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
            <Link to="/privacy" className="text-[10px] md:text-xs text-secondary-foreground/30 hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[10px] md:text-xs text-secondary-foreground/30 hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/refund" className="text-[10px] md:text-xs text-secondary-foreground/30 hover:text-primary transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
