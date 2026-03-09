import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type HeaderLink = {
  label: string;
  href: string;
  is_highlight?: boolean;
};

type HeaderContact = {
  contact_type: "phone" | "cta";
  label: string;
  value: string;
  href?: string | null;
};

type BrandingSettings = {
  siteTitle: string;
  headerLogoHeight: number;
};

const fallbackNavLinks: HeaderLink[] = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs" },
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Enroll Now", href: "/enroll", is_highlight: true },
];

const fallbackContacts: HeaderContact[] = [
  { contact_type: "phone", label: "Call Us", value: "+91 99999 99999", href: "tel:+919999999999" },
  { contact_type: "cta", label: "LMS", value: "LMS", href: "/enroll" },
];

const isInternalRoute = (href: string) => href.startsWith("/") && !href.startsWith("//");
const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(12, Math.min(180, Math.round(parsed)));
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: navLinks } = useQuery({
    queryKey: ["header_links"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("header_links")
        .select("label,href,is_highlight")
        .eq("is_active", true)
        .order("sort_order");
      return data?.length ? (data as HeaderLink[]) : null;
    },
  });

  const { data: headerContacts } = useQuery({
    queryKey: ["header_contacts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("header_contacts")
        .select("contact_type,label,value,href")
        .eq("is_active", true)
        .order("sort_order");
      return data?.length ? (data as HeaderContact[]) : null;
    },
  });

  const { data: branding } = useQuery({
    queryKey: ["site_branding_header"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("key,value")
        .in("key", ["site_title", "header_logo_height"]);

      const map: Record<string, unknown> = {};
      for (const row of data || []) map[`${row.key || ""}`] = row.value;

      return {
        siteTitle: `${map.site_title || "Clouds Trail"}`.trim() || "Clouds Trail",
        headerLogoHeight: parsePositiveInt(map.header_logo_height, 40),
      } as BrandingSettings;
    },
  });

  const links = navLinks?.length ? navLinks : fallbackNavLinks;
  const contacts = headerContacts?.length ? headerContacts : fallbackContacts;
  const phoneContact = contacts.find((c) => c.contact_type === "phone") || fallbackContacts[0];
  const ctaContact = contacts.find((c) => c.contact_type === "cta") || fallbackContacts[1];
  const siteTitle = branding?.siteTitle || "Clouds Trail";
  const headerLogoHeight = branding?.headerLogoHeight || 40;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center">
          <img src={logo} alt={siteTitle} className="w-auto" style={{ height: `${headerLogoHeight}px` }} />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((link) => {
            const cls = link.is_highlight
              ? "text-sm font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              : "text-sm font-medium text-muted-foreground hover:text-primary transition-colors";

            return isInternalRoute(link.href) ? (
              <Link key={`${link.label}-${link.href}`} to={link.href} className={cls}>{link.label}</Link>
            ) : (
              <a key={`${link.label}-${link.href}`} href={link.href} className={cls}>{link.label}</a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <SocialLinks placement="header" variant="header" className="mr-1" />
          <a href={phoneContact.href || `tel:${phoneContact.value.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="h-4 w-4" /> {phoneContact.value}
          </a>
          {isInternalRoute(ctaContact.href || "") ? (
            <Link to={ctaContact.href || "/"}>
              <Button className="bg-primary text-primary-foreground font-semibold px-6 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
            </Link>
          ) : (
            <a href={ctaContact.href || "#"}>
              <Button className="bg-primary text-primary-foreground font-semibold px-6 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
            </a>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden bg-background border-b overflow-hidden">
            <nav className="container py-4 flex flex-col gap-2">
              {links.map((link) =>
                isInternalRoute(link.href) ? (
                  <Link key={`${link.label}-${link.href}`} to={link.href} className="text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>{link.label}</Link>
                ) : (
                  <a key={`${link.label}-${link.href}`} href={link.href} className="text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>{link.label}</a>
                ),
              )}
              <SocialLinks placement="header" variant="header" className="pt-2" />
              {isInternalRoute(ctaContact.href || "") ? (
                <Link to={ctaContact.href || "/"} onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-primary text-primary-foreground font-semibold mt-2 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
                </Link>
              ) : (
                <a href={ctaContact.href || "#"} onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-primary text-primary-foreground font-semibold mt-2 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
                </a>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
