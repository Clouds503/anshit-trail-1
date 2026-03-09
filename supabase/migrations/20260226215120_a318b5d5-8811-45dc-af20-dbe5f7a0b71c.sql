
-- Fix user_roles: drop restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix all admin tables: drop restrictive policies and recreate as permissive

-- blogs
DROP POLICY IF EXISTS "Admins can manage blogs" ON public.blogs;
DROP POLICY IF EXISTS "Public can view published blogs" ON public.blogs;
CREATE POLICY "Admins can manage blogs" ON public.blogs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view published blogs" ON public.blogs FOR SELECT TO anon, authenticated USING (is_published = true);

-- button_routes
DROP POLICY IF EXISTS "Admins can manage button routes" ON public.button_routes;
DROP POLICY IF EXISTS "Public can view button routes" ON public.button_routes;
CREATE POLICY "Admins can manage button routes" ON public.button_routes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view button routes" ON public.button_routes FOR SELECT TO anon, authenticated USING (true);

-- contact_info
DROP POLICY IF EXISTS "Admins can manage contact info" ON public.contact_info;
DROP POLICY IF EXISTS "Public can view contact info" ON public.contact_info;
CREATE POLICY "Admins can manage contact info" ON public.contact_info FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view contact info" ON public.contact_info FOR SELECT TO anon, authenticated USING (true);

-- faqs
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
DROP POLICY IF EXISTS "Public can view active faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view active faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (is_active = true);

-- footer_links
DROP POLICY IF EXISTS "Admins can manage footer links" ON public.footer_links;
DROP POLICY IF EXISTS "Public can view footer links" ON public.footer_links;
CREATE POLICY "Admins can manage footer links" ON public.footer_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view footer links" ON public.footer_links FOR SELECT TO anon, authenticated USING (is_active = true);

-- footer_sections
DROP POLICY IF EXISTS "Admins can manage footer sections" ON public.footer_sections;
DROP POLICY IF EXISTS "Public can view footer sections" ON public.footer_sections;
CREATE POLICY "Admins can manage footer sections" ON public.footer_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view footer sections" ON public.footer_sections FOR SELECT TO anon, authenticated USING (is_active = true);

-- hero_slides
DROP POLICY IF EXISTS "Admins can manage slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Public can view active slides" ON public.hero_slides;
CREATE POLICY "Admins can manage slides" ON public.hero_slides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view active slides" ON public.hero_slides FOR SELECT TO anon, authenticated USING (is_active = true);

-- leads
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- programs
DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Public can view active programs" ON public.programs;
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view active programs" ON public.programs FOR SELECT TO anon, authenticated USING (is_active = true);

-- seo_settings
DROP POLICY IF EXISTS "Admins can manage seo settings" ON public.seo_settings;
DROP POLICY IF EXISTS "Public can view seo settings" ON public.seo_settings;
CREATE POLICY "Admins can manage seo settings" ON public.seo_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view seo settings" ON public.seo_settings FOR SELECT TO anon, authenticated USING (true);

-- site_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can view settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- social_links
DROP POLICY IF EXISTS "Admins can manage social links" ON public.social_links;
DROP POLICY IF EXISTS "Public can view social links" ON public.social_links;
CREATE POLICY "Admins can manage social links" ON public.social_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view social links" ON public.social_links FOR SELECT TO anon, authenticated USING (is_active = true);

-- stats
DROP POLICY IF EXISTS "Admins can manage stats" ON public.stats;
DROP POLICY IF EXISTS "Public can view stats" ON public.stats;
CREATE POLICY "Admins can manage stats" ON public.stats FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view stats" ON public.stats FOR SELECT TO anon, authenticated USING (true);

-- testimonials
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public can view active testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view active testimonials" ON public.testimonials FOR SELECT TO anon, authenticated USING (is_active = true);
