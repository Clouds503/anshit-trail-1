
-- Add source_page column to leads for page-wise tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_page text DEFAULT 'homepage';

-- Fix ALL RLS policies: Drop RESTRICTIVE ones and recreate as PERMISSIVE

-- BLOGS
DROP POLICY IF EXISTS "Public can view published blogs" ON public.blogs;
CREATE POLICY "Public can view published blogs" ON public.blogs FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage blogs" ON public.blogs;
CREATE POLICY "Admins can manage blogs" ON public.blogs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BUTTON_ROUTES
DROP POLICY IF EXISTS "Public can view button routes" ON public.button_routes;
CREATE POLICY "Public can view button routes" ON public.button_routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage button routes" ON public.button_routes;
CREATE POLICY "Admins can manage button routes" ON public.button_routes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CONTACT_INFO
DROP POLICY IF EXISTS "Public can view contact info" ON public.contact_info;
CREATE POLICY "Public can view contact info" ON public.contact_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage contact info" ON public.contact_info;
CREATE POLICY "Admins can manage contact info" ON public.contact_info FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FAQS
DROP POLICY IF EXISTS "Public can view active faqs" ON public.faqs;
CREATE POLICY "Public can view active faqs" ON public.faqs FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FOOTER_LINKS
DROP POLICY IF EXISTS "Public can view footer links" ON public.footer_links;
CREATE POLICY "Public can view footer links" ON public.footer_links FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage footer links" ON public.footer_links;
CREATE POLICY "Admins can manage footer links" ON public.footer_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FOOTER_SECTIONS
DROP POLICY IF EXISTS "Public can view footer sections" ON public.footer_sections;
CREATE POLICY "Public can view footer sections" ON public.footer_sections FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage footer sections" ON public.footer_sections;
CREATE POLICY "Admins can manage footer sections" ON public.footer_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- HERO_SLIDES
DROP POLICY IF EXISTS "Public can view active slides" ON public.hero_slides;
CREATE POLICY "Public can view active slides" ON public.hero_slides FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage slides" ON public.hero_slides;
CREATE POLICY "Admins can manage slides" ON public.hero_slides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LEADS
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROGRAMS
DROP POLICY IF EXISTS "Public can view active programs" ON public.programs;
CREATE POLICY "Public can view active programs" ON public.programs FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SEO_SETTINGS
DROP POLICY IF EXISTS "Public can view seo settings" ON public.seo_settings;
CREATE POLICY "Public can view seo settings" ON public.seo_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage seo settings" ON public.seo_settings;
CREATE POLICY "Admins can manage seo settings" ON public.seo_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SITE_SETTINGS
DROP POLICY IF EXISTS "Public can view settings" ON public.site_settings;
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SOCIAL_LINKS
DROP POLICY IF EXISTS "Public can view social links" ON public.social_links;
CREATE POLICY "Public can view social links" ON public.social_links FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage social links" ON public.social_links;
CREATE POLICY "Admins can manage social links" ON public.social_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- STATS
DROP POLICY IF EXISTS "Public can view stats" ON public.stats;
CREATE POLICY "Public can view stats" ON public.stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage stats" ON public.stats;
CREATE POLICY "Admins can manage stats" ON public.stats FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TESTIMONIALS
DROP POLICY IF EXISTS "Public can view active testimonials" ON public.testimonials;
CREATE POLICY "Public can view active testimonials" ON public.testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
