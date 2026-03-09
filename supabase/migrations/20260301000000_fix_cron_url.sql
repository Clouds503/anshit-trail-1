-- Update the cron job to use the new Supabase URL
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

-- Reschedule with new URL
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
