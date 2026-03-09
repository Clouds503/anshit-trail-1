import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, BookOpen, FileText, MessageSquare, Search, Settings, Users } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  { label: "Programs", table: "programs", icon: BookOpen, url: "/admin/programs", color: "bg-primary/10 text-primary" },
  { label: "Blogs", table: "blogs", icon: FileText, url: "/admin/blogs", color: "bg-accent text-accent-foreground" },
  { label: "Testimonials", table: "testimonials", icon: MessageSquare, url: "/admin/testimonials", color: "bg-destructive/10 text-destructive" },
  { label: "Leads", table: "leads", icon: Users, url: "/admin/leads", color: "bg-muted text-muted-foreground" },
];

const quickActions = [
  { label: "Manage Programs", url: "/admin/programs", icon: BookOpen, tone: "bg-primary text-primary-foreground" },
  { label: "Manage Blogs", url: "/admin/blogs", icon: FileText, tone: "bg-primary text-primary-foreground" },
  { label: "Blog Showcase", url: "/admin/blog-showcase", icon: FileText, tone: "bg-primary text-primary-foreground" },
  { label: "Auto Generate Blog", url: "/admin/auto-blog", icon: FileText, tone: "bg-accent text-accent-foreground" },
  { label: "SEO Settings", url: "/admin/seo", icon: Search, tone: "bg-accent text-accent-foreground" },
  { label: "Site Settings", url: "/admin/settings", icon: Settings, tone: "bg-muted text-muted-foreground" },
];

const Dashboard = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const results: Record<string, number> = {};
      for (const c of cards) {
        const { count } = await (supabase as any).from(c.table).select("*", { count: "exact", head: true });
        results[c.table] = count ?? 0;
      }
      setCounts(results);
    };
    fetchCounts();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick overview and shortcuts for core admin operations.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.table}
            to={c.url}
            className="min-h-[102px] rounded-lg border bg-card px-3 py-3 transition-shadow hover:shadow-md sm:min-h-[118px] sm:p-5"
          >
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg sm:mb-3 sm:h-10 sm:w-10 ${c.color}`}>
              <c.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground sm:text-2xl">{counts[c.table] ?? "-"}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="mb-3 font-heading font-bold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.url}
              to={action.url}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-opacity hover:opacity-90 ${action.tone}`}
            >
              <span className="inline-flex items-center gap-2">
                <action.icon className="h-4 w-4 shrink-0" />
                <span>{action.label}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
