import { useEffect, useState } from "react";
import { Menu, X, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isInternalRouteHref, normalizeInternalRouteHref } from "@/lib/public-url";

type HeaderLink = {
  label: string;
  href: string;
  is_highlight?: boolean;
};

type HeaderContact = {
  contact_type: "phone" | "address" | "cta";
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
  { contact_type: "phone", label: "Call Us", value: "+91 92598 98397", href: "tel:+919259898397" },
  { contact_type: "address", label: "Visit Us", value: "Noida, Uttar Pradesh", href: "https://maps.google.com/?q=Noida%2C%20Uttar%20Pradesh" },
  { contact_type: "cta", label: "LMS", value: "LMS", href: "/enroll" },
];

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(12, Math.min(180, Math.round(parsed)));
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: navLinks, isError: navLinksError } = useQuery({
    queryKey: ["header_links"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("header_links")
        .select("label,href,is_highlight")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as HeaderLink[];
    },
    refetchOnMount: "always",
  });

  const { data: headerContacts, isError: headerContactsError } = useQuery({
    queryKey: ["header_contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("header_contacts")
        .select("contact_type,label,value,href")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as HeaderContact[];
    },
    refetchOnMount: "always",
  });

  const { data: branding } = useQuery({
    queryKey: ["site_branding_header"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("key,value")
        .in("key", ["site_title", "header_logo_height"]);
      if (error) throw error;

      const map: Record<string, unknown> = {};
      for (const row of data || []) map[`${row.key || ""}`] = row.value;

      return {
        siteTitle: `${map.site_title || "Clouds Trail"}`.trim() || "Clouds Trail",
        headerLogoHeight: parsePositiveInt(map.header_logo_height, 40),
      } as BrandingSettings;
    },
    refetchOnMount: "always",
  });

  useEffect(() => {
    const refreshHeaderData = () => {
      queryClient.invalidateQueries({ queryKey: ["header_links"] });
      queryClient.invalidateQueries({ queryKey: ["header_contacts"] });
    };

    const channel = supabase
      .channel("header-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "header_links" },
        refreshHeaderData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "header_contacts" },
        refreshHeaderData,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload: any) => {
          const key = `${payload?.new?.key || payload?.old?.key || ""}`.trim();
          if (key === "site_title" || key === "header_logo_height") {
            queryClient.invalidateQueries({ queryKey: ["site_branding_header"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const links = navLinksError ? fallbackNavLinks : (navLinks || []);
  const contacts = headerContactsError ? fallbackContacts : (headerContacts || []);
  const phoneContact = contacts.find((c) => c.contact_type === "phone") || (headerContactsError ? fallbackContacts[0] : null);
  const addressContact = contacts.find((c) => c.contact_type === "address") || (headerContactsError ? fallbackContacts[1] : null);
  const ctaContact = contacts.find((c) => c.contact_type === "cta") || (headerContactsError ? fallbackContacts[2] : null);
  const normalizedCtaHref = ctaContact ? normalizeInternalRouteHref(ctaContact.href || "/") : null;
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
            const normalizedHref = normalizeInternalRouteHref(link.href || "/");
            const cls = link.is_highlight
              ? "text-sm font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              : "text-sm font-medium text-muted-foreground hover:text-primary transition-colors";

            return isInternalRouteHref(normalizedHref) ? (
              <Link key={`${link.label}-${normalizedHref}`} to={normalizedHref} className={cls}>{link.label}</Link>
            ) : (
              <a key={`${link.label}-${normalizedHref}`} href={normalizedHref} className={cls}>{link.label}</a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <SocialLinks placement="header" variant="header" className="mr-1" />
          {phoneContact ? (
            <a href={phoneContact.href || `tel:${(phoneContact.value || "").replace(/\s+/g, "")}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-4 w-4" /> {phoneContact.value}
            </a>
          ) : null}
          {addressContact ? (
            <a
              href={addressContact.href || "#"}
              className="hidden lg:flex max-w-[220px] items-center gap-1.5 truncate text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={addressContact.value}
            >
              <MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{addressContact.value}</span>
            </a>
          ) : null}
          {ctaContact && normalizedCtaHref ? (
            isInternalRouteHref(normalizedCtaHref) ? (
              <Link to={normalizedCtaHref}>
                <Button className="bg-primary text-primary-foreground font-semibold px-6 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
              </Link>
            ) : (
              <a href={normalizedCtaHref}>
                <Button className="bg-primary text-primary-foreground font-semibold px-6 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
              </a>
            )
          ) : null}
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
                (() => {
                  const normalizedHref = normalizeInternalRouteHref(link.href || "/");
                  return isInternalRouteHref(normalizedHref) ? (
                    <Link key={`${link.label}-${normalizedHref}`} to={normalizedHref} className="text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>{link.label}</Link>
                  ) : (
                    <a key={`${link.label}-${normalizedHref}`} href={normalizedHref} className="text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>{link.label}</a>
                  );
                })(),
              )}
              <SocialLinks placement="header" variant="header" className="pt-2" />
              {phoneContact ? (
                <a
                  href={phoneContact.href || `tel:${(phoneContact.value || "").replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 py-2 text-sm text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <Phone className="h-4 w-4 text-primary" /> {phoneContact.value}
                </a>
              ) : null}
              {addressContact ? (
                <a
                  href={addressContact.href || "#"}
                  className="flex items-center gap-2 py-2 text-sm text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <MapPin className="h-4 w-4 text-primary" /> {addressContact.value}
                </a>
              ) : null}
              {ctaContact && normalizedCtaHref ? (
                isInternalRouteHref(normalizedCtaHref) ? (
                  <Link to={normalizedCtaHref} onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground font-semibold mt-2 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
                  </Link>
                ) : (
                  <a href={normalizedCtaHref} onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground font-semibold mt-2 rounded-lg">{ctaContact.label || ctaContact.value || "LMS"}</Button>
                  </a>
                )
              ) : null}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
