import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import PublicPageAnalytics from "./components/PublicPageAnalytics";
import RouteSeoManager from "./components/RouteSeoManager";
import Index from "./pages/Index";
import CourseDetail from "./pages/CourseDetail";
import Programs from "./pages/Programs";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import EnrollNow from "./pages/EnrollNow";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminGuard from "./components/admin/AdminGuard";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import ProgramsAdmin from "./pages/admin/ProgramsAdmin";
import BestCoursesAdmin from "./pages/admin/BestCoursesAdmin";
import BlogsAdmin from "./pages/admin/BlogsAdmin";
import TestimonialsAdmin from "./pages/admin/TestimonialsAdmin";
import FaqsAdmin from "./pages/admin/FaqsAdmin";
import StatsAdmin from "./pages/admin/StatsAdmin";
import HeroAdmin from "./pages/admin/HeroAdmin";
import FooterAdmin from "./pages/admin/FooterAdmin";
import ContactAdmin from "./pages/admin/ContactAdmin";
import SocialLinksAdmin from "./pages/admin/SocialLinksAdmin";
import ButtonRoutesAdmin from "./pages/admin/ButtonRoutesAdmin";
import SeoAdmin from "./pages/admin/SeoAdmin";
import SettingsAdmin from "./pages/admin/SettingsAdmin";
import AutoBlogAdmin from "./pages/admin/AutoBlogAdmin";
import LeadsAdmin from "./pages/admin/LeadsAdmin";
import PagesAdmin from "./pages/admin/PagesAdmin";
import EnrollmentsAdmin from "./pages/admin/EnrollmentsAdmin";
import BlogTypographyAdmin from "./pages/admin/BlogTypographyAdmin";
import TrainersAdmin from "./pages/admin/TrainersAdmin";
import StudentsAdmin from "./pages/admin/StudentsAdmin";
import HeaderAdmin from "./pages/admin/HeaderAdmin";
import ContentSeoAdmin from "./pages/admin/ContentSeoAdmin";
import BannersAdmin from "./pages/admin/BannersAdmin";
import BlogPerformanceAdmin from "./pages/admin/BlogPerformanceAdmin";
import PreloaderAdmin from "./pages/admin/PreloaderAdmin";

const queryClient = new QueryClient();

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <AdminGuard><AdminLayout>{children}</AdminLayout></AdminGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <RouteSeoManager />
        <PublicPageAnalytics />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/course/:slug" element={<CourseDetail />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/courses" element={<Programs />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blogs" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/terms-condition" element={<TermsAndConditions />} />
          <Route path="/terms-conditions" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/terms-of-service" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/enroll" element={<EnrollNow />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPage><Dashboard /></AdminPage>} />
          <Route path="/admin/programs" element={<AdminPage><ProgramsAdmin /></AdminPage>} />
          <Route path="/admin/best-courses" element={<AdminPage><BestCoursesAdmin /></AdminPage>} />
          <Route path="/admin/pages" element={<AdminPage><PagesAdmin /></AdminPage>} />
          <Route path="/admin/blogs" element={<AdminPage><BlogsAdmin /></AdminPage>} />
          <Route path="/admin/blog-editor" element={<AdminPage><BlogTypographyAdmin /></AdminPage>} />
          <Route path="/admin/auto-blog" element={<AdminPage><AutoBlogAdmin /></AdminPage>} />
          <Route path="/admin/blog-metrics" element={<AdminPage><BlogPerformanceAdmin /></AdminPage>} />
          <Route path="/admin/testimonials" element={<AdminPage><TestimonialsAdmin /></AdminPage>} />
          <Route path="/admin/trainers" element={<AdminPage><TrainersAdmin /></AdminPage>} />
          <Route path="/admin/students" element={<AdminPage><StudentsAdmin /></AdminPage>} />
          <Route path="/admin/faqs" element={<AdminPage><FaqsAdmin /></AdminPage>} />
          <Route path="/admin/stats" element={<AdminPage><StatsAdmin /></AdminPage>} />
          <Route path="/admin/hero" element={<AdminPage><HeroAdmin /></AdminPage>} />
          <Route path="/admin/preloader" element={<AdminPage><PreloaderAdmin /></AdminPage>} />
          <Route path="/admin/footer" element={<AdminPage><FooterAdmin /></AdminPage>} />
          <Route path="/admin/contact" element={<AdminPage><ContactAdmin /></AdminPage>} />
          <Route path="/admin/header" element={<AdminPage><HeaderAdmin /></AdminPage>} />
          <Route path="/admin/banners" element={<AdminPage><BannersAdmin /></AdminPage>} />
          <Route path="/admin/social" element={<AdminPage><SocialLinksAdmin /></AdminPage>} />
          <Route path="/admin/button-routes" element={<AdminPage><ButtonRoutesAdmin /></AdminPage>} />
          <Route path="/admin/seo" element={<AdminPage><SeoAdmin /></AdminPage>} />
          <Route path="/admin/settings" element={<AdminPage><SettingsAdmin /></AdminPage>} />
          <Route path="/admin/content-seo" element={<AdminPage><ContentSeoAdmin /></AdminPage>} />
          <Route path="/admin/leads" element={<AdminPage><LeadsAdmin /></AdminPage>} />
          <Route path="/admin/enrollments" element={<AdminPage><EnrollmentsAdmin /></AdminPage>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
