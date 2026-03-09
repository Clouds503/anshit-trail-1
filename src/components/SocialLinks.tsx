import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Facebook,
  Globe,
  Github,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type SocialDisplayPlacement = "header" | "footer" | "contact" | "about";
type SocialVariant = "header" | "footer" | "contact" | "floating3d";

interface SocialLinkRow {
  id: string;
  platform: string;
  icon: string;
  url: string;
}

interface SocialLinksProps {
  placement: SocialDisplayPlacement;
  variant?: SocialVariant;
  className?: string;
}

const floatingColorMap: Record<string, string> = {
  facebook: "from-blue-600 via-blue-500 to-cyan-400",
  instagram: "from-pink-500 via-rose-500 to-orange-400",
  linkedin: "from-sky-600 via-blue-600 to-indigo-500",
  youtube: "from-red-600 via-red-500 to-rose-400",
  github: "from-slate-700 via-slate-600 to-slate-500",
  twitter: "from-sky-500 via-cyan-500 to-blue-500",
  twitterx: "from-slate-700 via-slate-600 to-slate-500",
  x: "from-slate-700 via-slate-600 to-slate-500",
  telegram: "from-sky-500 via-cyan-500 to-blue-500",
  send: "from-sky-500 via-cyan-500 to-blue-500",
};

const iconMap: Record<string, LucideIcon> = {
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  twitterx: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  telegram: Send,
  send: Send,
};

const normalizeToken = (value?: string | null) =>
  `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toExternalUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

const resolveIcon = (platform: string, iconName: string): LucideIcon =>
  iconMap[normalizeToken(iconName)] || iconMap[normalizeToken(platform)] || Globe;

const resolveFloatingPalette = (platform: string, iconName: string) => {
  const platformToken = normalizeToken(platform);
  const iconToken = normalizeToken(iconName);
  return (
    floatingColorMap[platformToken] ||
    floatingColorMap[iconToken] ||
    "from-primary via-sky-500 to-cyan-400"
  );
};

const compactTitle = (value: string) => value.trim().split(/\s+/)[0] || "Social";

const SocialLinks = ({ placement, variant = "footer", className }: SocialLinksProps) => {
  const { data: links } = useQuery({
    queryKey: ["social-links", placement],
    queryFn: async (): Promise<SocialLinkRow[]> => {
      const { data, error } = await (supabase as any)
        .from("social_links")
        .select("id, platform, icon, url")
        .eq("is_active", true)
        .contains("display_in", [placement])
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Failed to fetch social links", error);
        return [];
      }

      return data || [];
    },
  });

  if (!links || links.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 sm:gap-3",
        variant === "floating3d" ? "justify-center gap-3 sm:gap-4 [transform-style:preserve-3d]" : "",
        className,
      )}
    >
      {links.map((link, index) => {
        const Icon = resolveIcon(link.platform, link.icon);
        const title = link.platform?.replace(/[_-]/g, " ") || "Social";
        const href = toExternalUrl(link.url);
        const floatingPalette = resolveFloatingPalette(link.platform, link.icon);
        const shortTitle = compactTitle(title);
        const baseClass = cn(
          "inline-flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variant === "header" && "h-8 w-8 rounded-full border border-primary/20 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary",
          variant === "footer" && "h-9 w-9 rounded-full border border-secondary-foreground/15 text-secondary-foreground/70 hover:-translate-y-0.5 hover:text-primary hover:border-primary/40",
          variant === "contact" && "h-10 w-10 rounded-full border border-primary/20 bg-accent/20 text-foreground hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary",
          variant === "floating3d" &&
            "group relative isolate h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br text-primary-foreground shadow-[0_14px_28px_-16px_rgba(2,132,199,0.95)] hover:shadow-[0_20px_38px_-18px_rgba(2,132,199,0.95)] sm:h-14 sm:w-14 md:h-16 md:w-16",
        );
        const iconClass = cn(
          "h-4 w-4",
          variant === "contact" ? "h-5 w-5" : "",
          variant === "floating3d" ? "h-5 w-5 sm:h-6 sm:w-6" : "",
        );

        if (variant === "floating3d") {
          return (
            <motion.a
              key={link.id}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              title={title}
              className={cn(baseClass, floatingPalette)}
              initial={{ y: 0, rotateX: -8 }}
              animate={{ y: [0, -8, 0], rotateZ: [0, index % 2 === 0 ? 2 : -2, 0] }}
              transition={{ duration: 3.2 + (index % 3) * 0.35, delay: index * 0.1, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ y: -8, rotateY: 8, rotateX: -4, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.36),transparent_58%)]" />
              <span className="pointer-events-none absolute inset-x-3 top-1 h-px bg-white/50" />
              <span className="relative z-10 flex flex-col items-center justify-center">
                <Icon className={cn(iconClass, "drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]")} />
                <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-white/85 sm:block">
                  {shortTitle}
                </span>
              </span>
              <span className="sr-only">{title}</span>
            </motion.a>
          );
        }

        return (
          <a key={link.id} href={href} target="_blank" rel="noreferrer noopener" title={title} className={baseClass}>
            <Icon className={iconClass} />
            <span className="sr-only">{title}</span>
          </a>
        );
      })}
    </div>
  );
};

export default SocialLinks;
