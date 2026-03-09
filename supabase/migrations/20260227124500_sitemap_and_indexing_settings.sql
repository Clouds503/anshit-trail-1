-- Default settings for sitemap + auto indexing pipeline
INSERT INTO public.site_settings (key, value) VALUES
  ('site_url', '""'::jsonb),
  ('sitemap_url', '""'::jsonb),
  ('indexing_api_url', '""'::jsonb),
  ('bing_sitemap_ping_enabled', 'true'::jsonb),
  ('indexnow_enabled', 'false'::jsonb),
  ('indexnow_key', '""'::jsonb),
  ('indexnow_host', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
