import { Link, useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard, BookOpen, FileText, MessageSquare, HelpCircle, BarChart3,
  Image, Settings, Globe, Link2, Phone, Share2, Bot, Search, LogOut, Footprints, Menu, ClipboardList, FileStack, CreditCard, GraduationCap, UserRound, Megaphone, LoaderCircle, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Programs", url: "/admin/programs", icon: BookOpen },
  { title: "Best Courses", url: "/admin/best-courses", icon: Star },
  { title: "Pages", url: "/admin/pages", icon: FileStack },
  { title: "Blogs", url: "/admin/blogs", icon: FileText },
  { title: "Blog Editor", url: "/admin/blog-editor", icon: FileText },
  { title: "Auto Blog", url: "/admin/auto-blog", icon: Bot },
  { title: "Blog Metrics", url: "/admin/blog-metrics", icon: BarChart3 },
  { title: "Testimonials", url: "/admin/testimonials", icon: MessageSquare },
  { title: "Our Trainers", url: "/admin/trainers", icon: GraduationCap },
  { title: "Our Students", url: "/admin/students", icon: UserRound },
  { title: "FAQs", url: "/admin/faqs", icon: HelpCircle },
  { title: "Stats", url: "/admin/stats", icon: BarChart3 },
  { title: "Hero Section", url: "/admin/hero", icon: Image },
  { title: "Preloader", url: "/admin/preloader", icon: LoaderCircle },
  { title: "Footer", url: "/admin/footer", icon: Footprints },
  { title: "Header Data", url: "/admin/header", icon: Globe },
  { title: "Banners", url: "/admin/banners", icon: Megaphone },
  { title: "Contact Info", url: "/admin/contact", icon: Phone },
  { title: "Social Links", url: "/admin/social", icon: Share2 },
  { title: "Button Routes", url: "/admin/button-routes", icon: Link2 },
  { title: "Leads", url: "/admin/leads", icon: ClipboardList },
  { title: "Enrollments", url: "/admin/enrollments", icon: CreditCard },
  { title: "SEO", url: "/admin/seo", icon: Search },
  { title: "Content SEO", url: "/admin/content-seo", icon: Globe },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAdmin();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} bg-secondary text-secondary-foreground flex flex-col transition-all duration-200 shrink-0`}>
        <div className="h-14 flex items-center px-4 border-b border-secondary-foreground/10 gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-secondary-foreground/60 hover:text-secondary-foreground">
            <Menu className="h-5 w-5" />
          </button>
          {!collapsed && <span className="font-heading font-bold text-sm">Admin Panel</span>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.url;
            return (
              <Link key={item.url} to={item.url} className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${active ? "bg-primary/20 text-primary font-medium" : "text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-secondary-foreground/5"}`}>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-secondary-foreground/10">
          <Link
            to="/"
            className={`mb-2 flex items-center rounded-md px-2 py-2 text-sm text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-secondary-foreground/5 ${collapsed ? "justify-center" : ""}`}
          >
            <Globe className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />
            {!collapsed && "Back to Site"}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className={`text-secondary-foreground/60 hover:text-secondary-foreground ${collapsed ? "w-full justify-center px-0" : "w-full justify-start"}`}>
            <LogOut className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
