import { Link, useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard, BookOpen, FileText, MessageSquare, HelpCircle, BarChart3,
  Image, Settings, Globe, Link2, Phone, Share2, Bot, Search, LogOut, Footprints, Menu, ClipboardList, FileStack, CreditCard, GraduationCap, UserRound, Megaphone, LoaderCircle, Star, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Programs", url: "/admin/programs", icon: BookOpen },
  { title: "Best Courses", url: "/admin/best-courses", icon: Star },
  { title: "Pages", url: "/admin/pages", icon: FileStack },
  { title: "Blogs", url: "/admin/blogs", icon: FileText },
  { title: "Blog Showcase", url: "/admin/blog-showcase", icon: FileText },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const renderNavLinks = (isCollapsed: boolean) => (
    <>
      {navItems.map((item) => {
        const active = location.pathname === item.url;
        return (
          <Link
            key={item.url}
            to={item.url}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/20 text-primary font-medium"
                : "text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/5"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{item.title}</span>}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-secondary-foreground/10 bg-secondary px-3 text-secondary-foreground md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-md p-2 text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-heading text-sm font-bold">Admin Panel</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="h-8 w-8 text-secondary-foreground/70 hover:text-secondary-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className={`fixed inset-0 z-50 md:hidden ${mobileNavOpen ? "" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className={`absolute inset-0 bg-black/45 transition-opacity ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[86vw] flex-col bg-secondary text-secondary-foreground shadow-xl transition-transform duration-200 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-secondary-foreground/10 px-4">
            <span className="font-heading text-sm font-bold">Admin Panel</span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-md p-2 text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">{renderNavLinks(false)}</nav>
          <div className="border-t border-secondary-foreground/10 p-3">
            <Link
              to="/"
              className="mb-2 flex items-center rounded-md px-2 py-2 text-sm text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
            >
              <Globe className="mr-2 h-4 w-4" />
              Back to Site
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="w-full justify-start text-secondary-foreground/70 hover:text-secondary-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>
      </div>

      {/* Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col bg-secondary text-secondary-foreground transition-all duration-200 md:flex ${collapsed ? "w-16" : "w-60"}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-secondary-foreground/10 px-4">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-secondary-foreground/60 hover:text-secondary-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          {!collapsed && <span className="font-heading font-bold text-sm">Admin Panel</span>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">{renderNavLinks(collapsed)}</nav>
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
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="px-3 py-4 sm:px-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
