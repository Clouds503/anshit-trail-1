-- Seed global branding settings used by Header/Footer/Admin.
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', '"Clouds Trail"'),
  ('site_subtitle', '"#1 IT Training Institute"'),
  ('site_description', '"India''s leading IT training institute with 100% placement assistance."'),
  ('header_logo_height', '40'),
  ('footer_logo_height', '40'),
  ('footer_bio', '"India''s leading IT training institute with 100% placement assistance."')
ON CONFLICT (key) DO NOTHING;

-- Seed footer sections from current public fallback content.
INSERT INTO public.footer_sections (title, sort_order, is_active)
SELECT 'Quick Links', 0, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.footer_sections WHERE lower(title) = 'quick links'
);

INSERT INTO public.footer_sections (title, sort_order, is_active)
SELECT 'Legal', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.footer_sections WHERE lower(title) = 'legal'
);

-- Seed footer links under Quick Links.
INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'About Us', '/about', 0, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'quick links'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'about us'
      AND fl.url = '/about'
  );

INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'Programs', '/programs', 1, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'quick links'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'programs'
      AND fl.url = '/programs'
  );

INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'Contact', '/contact', 2, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'quick links'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'contact'
      AND fl.url = '/contact'
  );

-- Seed footer links under Legal.
INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'Terms & Conditions', '/terms', 0, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'legal'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'terms & conditions'
      AND fl.url = '/terms'
  );

INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'Privacy Policy', '/privacy', 1, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'legal'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'privacy policy'
      AND fl.url = '/privacy'
  );

INSERT INTO public.footer_links (section_id, label, url, sort_order, is_active)
SELECT fs.id, 'Refund Policy', '/refund', 2, true
FROM public.footer_sections fs
WHERE lower(fs.title) = 'legal'
  AND NOT EXISTS (
    SELECT 1 FROM public.footer_links fl
    WHERE fl.section_id = fs.id
      AND lower(fl.label) = 'refund policy'
      AND fl.url = '/refund'
  );
