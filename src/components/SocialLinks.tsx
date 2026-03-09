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
        "flex flex-wrap items-center gap-2",
        variant === "floating3d" ? "justify-center gap-4 [transform-style:preserve-3d]" : "",
        className,
      )}
    >
      {links.map((link, index) => {
        const Icon = resolveIcon(link.platform, link.icon);
        const title = link.platform?.replace(/[_-]/g, " ") || "Social";
        const href = toExternalUrl(link.url);
        const baseClass = cn(
          "inline-flex items-center justify-center transition-all duration-300",
          variant === "header" && "h-8 w-8 rounded-full border border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-primary",
          variant === "footer" && "h-9 w-9 rounded-full border border-secondary-foreground/15 text-secondary-foreground/70 hover:text-primary hover:border-primary/40",
          variant === "contact" && "h-10 w-10 rounded-full border border-primary/20 bg-accent/20 text-foreground hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary",
          variant === "floating3d" &&
            "h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground shadow-[0_16px_30px_-16px_hsl(var(--primary)/0.9)] border border-primary-foreground/20 hover:scale-105",
        );
        const iconClass = cn(
          "h-4 w-4",
          variant === "contact" ? "h-5 w-5" : "",
          variant === "floating3d" ? "h-6 w-6" : "",
        );

        if (variant === "floating3d") {
          return (
            <motion.a
              key={link.id}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              title={title}
              className={baseClass}
              initial={{ y: 0, rotateX: -8 }}
              animate={{ y: [0, -8, 0], rotateZ: [0, index % 2 === 0 ? 2 : -2, 0] }}
              transition={{ duration: 3.2 + (index % 3) * 0.35, delay: index * 0.1, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ y: -10, rotateY: 10 }}
            >
              <Icon className={iconClass} />
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
