-- Make blog author permanent as "Clouds Trail"
ALTER TABLE public.blogs
  ALTER COLUMN author SET DEFAULT 'Clouds Trail';

UPDATE public.blogs
SET author = 'Clouds Trail'
WHERE author IS NULL OR btrim(author) = '' OR author <> 'Clouds Trail';
