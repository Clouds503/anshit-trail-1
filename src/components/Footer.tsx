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
    <footer className="overflow-x-clip bg-secondary text-secondary-foreground">
      <div className="container py-9 md:py-14">
        <div
          className="grid grid-cols-1 gap-7 sm:grid-cols-2 md:gap-10 md:[grid-template-columns:repeat(var(--footer-cols),minmax(0,1fr))]"
          style={{ "--footer-cols": String(footerCols) } as CSSProperties}
        >
          <div className="sm:col-span-2 md:col-span-1 text-center sm:text-left">
            <Link to="/" className="inline-flex sm:inline-block justify-center mb-3 md:mb-4">
              <img
                src={logo}
                alt={brandTitle}
                className="w-auto brightness-0 invert"
                style={{ height: `${footerLogoHeight}px` }}
              />
            </Link>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-secondary-foreground/50 sm:text-xs">
              {brandSubtitle}
            </p>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-secondary-foreground/70 sm:mx-0">
              {footerBio || brandDescription}
            </p>
          </div>

          {footerSections ? (
            footerSections.map((section) => (
              <div key={section.id} className="text-center sm:text-left">
                <h4 className="mb-2.5 text-[11px] font-heading font-bold uppercase tracking-wider text-secondary-foreground/45 sm:mb-3 sm:text-xs">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link: any) => (
                    <li key={link.id}>
                      <Link
                        to={String(link.label || "").trim().toLowerCase() === "all courses" ? "/programs" : link.url}
                        className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary"
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
              <div className="text-center sm:text-left">
                <h4 className="mb-2.5 text-[11px] font-heading font-bold uppercase tracking-wider text-secondary-foreground/45 sm:mb-3 sm:text-xs">Quick Links</h4>
                <ul className="space-y-2">
                  <li><Link to="/about" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">About Us</Link></li>
                  <li><Link to="/programs" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">Programs</Link></li>
                  <li><Link to="/contact" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">Contact</Link></li>
                </ul>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="mb-2.5 text-[11px] font-heading font-bold uppercase tracking-wider text-secondary-foreground/45 sm:mb-3 sm:text-xs">Legal</h4>
                <ul className="space-y-2">
                  <li><Link to="/terms" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">Terms & Conditions</Link></li>
                  <li><Link to="/privacy" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">Privacy Policy</Link></li>
                  <li><Link to="/refund" className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary">Refund Policy</Link></li>
                </ul>
              </div>
            </>
          )}

          <div className="sm:col-span-2 md:col-span-1 text-center sm:text-left">
            <h4 className="mb-2.5 text-[11px] font-heading font-bold uppercase tracking-wider text-secondary-foreground/45 sm:mb-3 sm:text-xs">Contact</h4>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start justify-center gap-2 text-sm text-secondary-foreground/75 sm:items-start sm:justify-start"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{address}</li>
              <li className="flex items-center justify-center gap-2 text-sm text-secondary-foreground/75 sm:justify-start"><Phone className="h-4 w-4 shrink-0 text-primary" />{phone}</li>
              <li className="flex items-center justify-center gap-2 text-sm text-secondary-foreground/75 sm:justify-start"><Mail className="h-4 w-4 shrink-0 text-primary" />{email}</li>
            </ul>
            <SocialLinks placement="footer" variant="footer" className="mt-3 md:mt-5 justify-center sm:justify-start" />
          </div>
        </div>
      </div>

      <div className="border-t border-secondary-foreground/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-3 pb-16 md:flex-row md:gap-3 md:py-4 md:pb-4">
          <p className="text-center text-[11px] text-secondary-foreground/35 sm:text-xs">(c) 2026 {brandTitle}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
            <Link to="/privacy" className="text-[11px] text-secondary-foreground/40 transition-colors hover:text-primary sm:text-xs">Privacy Policy</Link>
            <Link to="/terms" className="text-[11px] text-secondary-foreground/40 transition-colors hover:text-primary sm:text-xs">Terms of Service</Link>
            <Link to="/refund" className="text-[11px] text-secondary-foreground/40 transition-colors hover:text-primary sm:text-xs">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
