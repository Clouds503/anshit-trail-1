-- Short backlinks via managed short URLs.
CREATE TABLE IF NOT EXISTS public.short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  click_count BIGINT NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT short_links_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT short_links_target_url_format CHECK (target_url ~* '^(https?://[^[:space:]]+|/[^[:space:]]*)$')
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active short links" ON public.short_links;
CREATE POLICY "Public can view active short links"
  ON public.short_links
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage short links" ON public.short_links;
CREATE POLICY "Admins can manage short links"
  ON public.short_links
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_short_links_updated_at ON public.short_links;
CREATE TRIGGER update_short_links_updated_at
BEFORE UPDATE ON public.short_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_short_links_active_order ON public.short_links (is_active, sort_order, slug);

CREATE OR REPLACE FUNCTION public.resolve_short_link(p_slug TEXT)
RETURNS TABLE(target_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  v_slug := lower(trim(coalesce(p_slug, '')));
  IF v_slug = '' THEN
    RETURN;
  END IF;

  UPDATE public.short_links
  SET click_count = coalesce(click_count, 0) + 1,
      last_clicked_at = now(),
      updated_at = now()
  WHERE slug = v_slug
    AND is_active = true;

  RETURN QUERY
  SELECT s.target_url
  FROM public.short_links s
  WHERE s.slug = v_slug
    AND s.is_active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_short_link(TEXT) TO anon, authenticated, service_role;

INSERT INTO public.short_links (slug, target_url, anchor_text, notes, sort_order, is_active)
VALUES
  ('ct', '/', 'Clouds Trail', 'Primary short URL for homepage backlinks.', 0, true),
  ('programs', '/programs', 'Salesforce and Cloud Programs', 'Use in general program backlinks.', 1, true),
  ('sf-admin', '/programs', 'Salesforce Administration Training', 'Salesforce administration backlink alias.', 2, true),
  ('cloud-career', '/programs', 'Cloud Career Training', 'Cloud and career-focused backlink alias.', 3, true),
  ('placed-at', '/about', 'Currently Placed At', 'Use with placement-focused anchor text.', 4, true),
  ('blogs', '/blog', 'Salesforce Career Blogs', 'Backlink alias for blog archive.', 5, true),
  ('contact', '/contact', 'Contact Clouds Trail', 'Admissions and counseling backlink alias.', 6, true)
ON CONFLICT (slug) DO NOTHING;
