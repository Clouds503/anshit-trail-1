-- Update brand description defaults with target keyword coverage
-- without overwriting custom values unless they are empty or old default seed text.

DO $$
DECLARE
  keyword_description jsonb := '"Clouds Trail is a salesforce institute and IT institute offering Salesforce Admin, Salesforce Developer, sales force basics, Salesforce LWC, Salesforce Omni Studio, and Workday training."'::jsonb;
BEGIN
  INSERT INTO public.site_settings (key, value)
  VALUES ('site_description', keyword_description)
  ON CONFLICT (key) DO NOTHING;

  INSERT INTO public.site_settings (key, value)
  VALUES ('footer_bio', keyword_description)
  ON CONFLICT (key) DO NOTHING;

  UPDATE public.site_settings
  SET value = keyword_description
  WHERE key = 'site_description'
    AND (
      trim(both '"' from coalesce(value::text, '')) = ''
      OR trim(both '"' from coalesce(value::text, '')) = 'India''s leading IT training institute with 100% placement assistance.'
    );

  UPDATE public.site_settings
  SET value = keyword_description
  WHERE key = 'footer_bio'
    AND (
      trim(both '"' from coalesce(value::text, '')) = ''
      OR trim(both '"' from coalesce(value::text, '')) = 'India''s leading IT training institute with 100% placement assistance.'
    );
END $$;
