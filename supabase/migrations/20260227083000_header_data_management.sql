CREATE TABLE IF NOT EXISTS public.header_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.header_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type TEXT NOT NULL DEFAULT 'phone',
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  href TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.header_contacts
DROP CONSTRAINT IF EXISTS header_contacts_type_valid;

ALTER TABLE public.header_contacts
ADD CONSTRAINT header_contacts_type_valid
CHECK (contact_type IN ('phone', 'cta'));

ALTER TABLE public.header_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.header_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active header links" ON public.header_links;
CREATE POLICY "Public can view active header links"
ON public.header_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage header links" ON public.header_links;
CREATE POLICY "Admins can manage header links"
ON public.header_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view active header contacts" ON public.header_contacts;
CREATE POLICY "Public can view active header contacts"
ON public.header_contacts
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage header contacts" ON public.header_contacts;
CREATE POLICY "Admins can manage header contacts"
ON public.header_contacts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.header_links (label, href, sort_order, is_highlight, is_active)
SELECT * FROM (
  VALUES
    ('Home', '/', 0, false, true),
    ('Programs', '/programs', 1, false, true),
    ('About Us', '/about', 2, false, true),
    ('Blog', '/blog', 3, false, true),
    ('Contact', '/contact', 4, false, true),
    ('Enroll Now', '/enroll', 5, true, true)
) AS seed(label, href, sort_order, is_highlight, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.header_links);

INSERT INTO public.header_contacts (contact_type, label, value, href, sort_order, is_active)
SELECT * FROM (
  VALUES
    ('phone', 'Call Us', '+91 99999 99999', 'tel:+919999999999', 0, true),
    ('cta', 'LMS', 'LMS', '/enroll', 1, true)
) AS seed(contact_type, label, value, href, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.header_contacts);
