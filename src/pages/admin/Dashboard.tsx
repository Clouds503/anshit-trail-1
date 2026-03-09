import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, BookOpen, FileText, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  { label: "Programs", table: "programs", icon: BookOpen, url: "/admin/programs", color: "bg-primary/10 text-primary" },
  { label: "Blogs", table: "blogs", icon: FileText, url: "/admin/blogs", color: "bg-accent text-accent-foreground" },
  { label: "Testimonials", table: "testimonials", icon: MessageSquare, url: "/admin/testimonials", color: "bg-destructive/10 text-destructive" },
  { label: "Leads", table: "leads", icon: Users, url: "/admin", color: "bg-muted text-muted-foreground" },
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
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.table} to={c.url} className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{counts[c.table] ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="bg-card border rounded-lg p-6">
        <h2 className="font-heading font-bold text-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/programs" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90">Manage Programs</Link>
          <Link to="/admin/blogs" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90">Manage Blogs</Link>
          <Link to="/admin/blog-showcase" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90">Blog Showcase</Link>
          <Link to="/admin/auto-blog" className="text-sm bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90">Auto Generate Blog</Link>
          <Link to="/admin/seo" className="text-sm bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90">SEO Settings</Link>
          <Link to="/admin/settings" className="text-sm bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:opacity-90">Site Settings</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
