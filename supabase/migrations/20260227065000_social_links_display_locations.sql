ALTER TABLE public.social_links
ADD COLUMN IF NOT EXISTS display_in text[] NOT NULL DEFAULT ARRAY['footer']::text[];

UPDATE public.social_links
SET display_in = ARRAY['footer']::text[]
WHERE display_in IS NULL OR cardinality(display_in) = 0;

ALTER TABLE public.social_links
DROP CONSTRAINT IF EXISTS social_links_display_in_valid;

ALTER TABLE public.social_links
ADD CONSTRAINT social_links_display_in_valid CHECK (
  display_in <@ ARRAY['header', 'footer', 'contact', 'about']::text[]
  AND cardinality(display_in) > 0
);
