-- Point cron-triggered Edge Function calls at the current Supabase project.

CREATE OR REPLACE FUNCTION public.configure_blog_queue_cron()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time TEXT := '09:00';
  v_expr TEXT;
  v_job_id BIGINT;
  v_command TEXT;
BEGIN
  SELECT COALESCE(NULLIF(trim(both '"' from value::text), ''), '09:00')
  INTO v_time
  FROM public.site_settings
  WHERE key = 'blog_schedule_time'
  LIMIT 1;

  v_expr := public.blog_schedule_time_to_cron_expr(v_time);

  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN ('process-blog-queue-daily-0900-ist', 'process-blog-queue-daily-dynamic-ist')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  v_command := $sql$
    SELECT net.http_post(
      url := 'https://oxvjyrwyrfggbaqyhaov.supabase.co/functions/v1/process-blog-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(
          (SELECT trim(both '"' from value::text) FROM public.site_settings WHERE key = 'blog_cron_secret' LIMIT 1),
          ''
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $sql$;

  PERFORM cron.schedule('process-blog-queue-daily-dynamic-ist', v_expr, v_command);
  RETURN v_expr;
END;
$$;

CREATE OR REPLACE FUNCTION public.configure_blog_refresh_cron()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id BIGINT;
  v_expr TEXT := '45 3 * * 1'; -- Monday 03:45 UTC (09:15 IST)
  v_command TEXT;
BEGIN
  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'queue-weak-blogs-weekly-ist'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  v_command := $sql$
    SELECT net.http_post(
      url := 'https://oxvjyrwyrfggbaqyhaov.supabase.co/functions/v1/refresh-weak-blogs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(
          (SELECT trim(both '"' from value::text) FROM public.site_settings WHERE key = 'blog_cron_secret' LIMIT 1),
          ''
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $sql$;

  PERFORM cron.schedule('queue-weak-blogs-weekly-ist', v_expr, v_command);
  RETURN v_expr;
END;
$$;

-- Resync existing cron jobs with the updated function definitions.
SELECT public.configure_blog_queue_cron();
SELECT public.configure_blog_refresh_cron();
