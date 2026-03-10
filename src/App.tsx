import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ScrollToTop from "./components/ScrollToTop";
import PublicPageAnalytics from "./components/PublicPageAnalytics";
import PublicMetaPixel from "./components/PublicMetaPixel";
import RouteSeoManager from "./components/RouteSeoManager";
import AdminGuard from "./components/admin/AdminGuard";
import AdminLayout from "./components/admin/AdminLayout";

const Index = lazy(() => import("./pages/Index"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Programs = lazy(() => import("./pages/Programs"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const EnrollNow = lazy(() => import("./pages/EnrollNow"));
const ShortLinkRedirect = lazy(() => import("./pages/ShortLinkRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ProgramsAdmin = lazy(() => import("./pages/admin/ProgramsAdmin"));
const BestCoursesAdmin = lazy(() => import("./pages/admin/BestCoursesAdmin"));
const BlogsAdmin = lazy(() => import("./pages/admin/BlogsAdmin"));
const TestimonialsAdmin = lazy(() => import("./pages/admin/TestimonialsAdmin"));
const FaqsAdmin = lazy(() => import("./pages/admin/FaqsAdmin"));
const StatsAdmin = lazy(() => import("./pages/admin/StatsAdmin"));
const HeroAdmin = lazy(() => import("./pages/admin/HeroAdmin"));
const FooterAdmin = lazy(() => import("./pages/admin/FooterAdmin"));
const ContactAdmin = lazy(() => import("./pages/admin/ContactAdmin"));
const SocialLinksAdmin = lazy(() => import("./pages/admin/SocialLinksAdmin"));
const ButtonRoutesAdmin = lazy(() => import("./pages/admin/ButtonRoutesAdmin"));
const ShortLinksAdmin = lazy(() => import("./pages/admin/ShortLinksAdmin"));
const SeoAdmin = lazy(() => import("./pages/admin/SeoAdmin"));
const SettingsAdmin = lazy(() => import("./pages/admin/SettingsAdmin"));
const AutoBlogAdmin = lazy(() => import("./pages/admin/AutoBlogAdmin"));
const LeadsAdmin = lazy(() => import("./pages/admin/LeadsAdmin"));
const PagesAdmin = lazy(() => import("./pages/admin/PagesAdmin"));
const EnrollmentsAdmin = lazy(() => import("./pages/admin/EnrollmentsAdmin"));
const BlogTypographyAdmin = lazy(() => import("./pages/admin/BlogTypographyAdmin"));
const BlogShowcaseAdmin = lazy(() => import("./pages/admin/BlogShowcaseAdmin"));
const TrainersAdmin = lazy(() => import("./pages/admin/TrainersAdmin"));
const StudentsAdmin = lazy(() => import("./pages/admin/StudentsAdmin"));
const HeaderAdmin = lazy(() => import("./pages/admin/HeaderAdmin"));
const ContentSeoAdmin = lazy(() => import("./pages/admin/ContentSeoAdmin"));
const BannersAdmin = lazy(() => import("./pages/admin/BannersAdmin"));
const BlogPerformanceAdmin = lazy(() => import("./pages/admin/BlogPerformanceAdmin"));
const PreloaderAdmin = lazy(() => import("./pages/admin/PreloaderAdmin"));

const queryClient = new QueryClient();

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <AdminGuard><AdminLayout>{children}</AdminLayout></AdminGuard>
);

const RouteFallback = () => <div className="min-h-screen bg-background" />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <RouteSeoManager />
        <PublicPageAnalytics />
        <PublicMetaPixel />
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/s/:slug" element={<ShortLinkRedirect />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPage><Dashboard /></AdminPage>} />
            <Route path="/admin/programs" element={<AdminPage><ProgramsAdmin /></AdminPage>} />
            <Route path="/admin/best-courses" element={<AdminPage><BestCoursesAdmin /></AdminPage>} />
            <Route path="/admin/pages" element={<AdminPage><PagesAdmin /></AdminPage>} />
            <Route path="/admin/blogs" element={<AdminPage><BlogsAdmin /></AdminPage>} />
            <Route path="/admin/blog-showcase" element={<AdminPage><BlogShowcaseAdmin /></AdminPage>} />
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
            <Route path="/admin/short-links" element={<AdminPage><ShortLinksAdmin /></AdminPage>} />
            <Route path="/admin/seo" element={<AdminPage><SeoAdmin /></AdminPage>} />
            <Route path="/admin/settings" element={<AdminPage><SettingsAdmin /></AdminPage>} />
            <Route path="/admin/content-seo" element={<AdminPage><ContentSeoAdmin /></AdminPage>} />
            <Route path="/admin/leads" element={<AdminPage><LeadsAdmin /></AdminPage>} />
            <Route path="/admin/enrollments" element={<AdminPage><EnrollmentsAdmin /></AdminPage>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
