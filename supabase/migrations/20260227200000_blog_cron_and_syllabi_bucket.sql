-- Enable scheduler + HTTP client extensions for cron-triggered Edge Function calls.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Ensure a single daily cron job exists for queue processing.
DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'process-blog-queue-daily-0900-ist'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

-- 09:00 IST = 03:30 UTC. Supabase cron schedules are evaluated in UTC.
SELECT cron.schedule(
  'process-blog-queue-daily-0900-ist',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dgnjxmtpfsdcfsalgvgi.supabase.co/functions/v1/process-blog-queue',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Create/update public syllabus bucket for uploaded PDF files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'syllabi',
  'syllabi',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for syllabus files.
DROP POLICY IF EXISTS "Public can view syllabi files" ON storage.objects;
CREATE POLICY "Public can view syllabi files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'syllabi');

DROP POLICY IF EXISTS "Admins can upload syllabi files" ON storage.objects;
CREATE POLICY "Admins can upload syllabi files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'syllabi' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update syllabi files" ON storage.objects;
CREATE POLICY "Admins can update syllabi files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'syllabi' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'syllabi' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete syllabi files" ON storage.objects;
CREATE POLICY "Admins can delete syllabi files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'syllabi' AND public.has_role(auth.uid(), 'admin'::public.app_role));
