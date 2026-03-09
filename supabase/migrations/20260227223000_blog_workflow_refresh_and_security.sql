-- Blog workflow + automation + security hardening
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Queue workflow states and refresh metadata.
UPDATE public.blog_queue
SET status = 'review'
WHERE status = 'ready';

ALTER TABLE public.blog_queue
  DROP CONSTRAINT IF EXISTS blog_queue_status_check;

ALTER TABLE public.blog_queue
  ADD CONSTRAINT blog_queue_status_check
  CHECK (status IN ('pending', 'generating', 'generated', 'review', 'published', 'failed'));

ALTER TABLE public.blog_queue
  ADD COLUMN IF NOT EXISTS queue_type TEXT NOT NULL DEFAULT 'new';

ALTER TABLE public.blog_queue
  ADD COLUMN IF NOT EXISTS source_blog_id UUID REFERENCES public.blogs(id) ON DELETE SET NULL;

ALTER TABLE public.blog_queue
  DROP CONSTRAINT IF EXISTS blog_queue_queue_type_check;

ALTER TABLE public.blog_queue
  ADD CONSTRAINT blog_queue_queue_type_check
  CHECK (queue_type IN ('new', 'refresh'));

CREATE INDEX IF NOT EXISTS idx_blog_queue_status_scheduled_date
  ON public.blog_queue(status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_blog_queue_source_blog_id
  ON public.blog_queue(source_blog_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_queue_active_source_blog_unique
  ON public.blog_queue(source_blog_id)
  WHERE source_blog_id IS NOT NULL AND status IN ('pending', 'generating', 'generated', 'review');

-- Defaults for schedule and secure cron secret.
INSERT INTO public.site_settings(key, value)
VALUES
  ('blog_schedule_time', '"09:00"'::jsonb),
  ('blog_schedule_timezone', '"Asia/Kolkata"'::jsonb),
  ('blog_cron_secret', to_jsonb(gen_random_uuid()::text)),
  ('blog_refresh_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.site_settings
SET value = to_jsonb(gen_random_uuid()::text)
WHERE key = 'blog_cron_secret'
  AND (value IS NULL OR trim(both '"' from value::text) = '');

-- 09:00 IST style schedule input (HH:MM) -> UTC cron expression.
CREATE OR REPLACE FUNCTION public.blog_schedule_time_to_cron_expr(p_time TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hh INTEGER;
  mm INTEGER;
  total_minutes INTEGER;
BEGIN
  IF p_time IS NULL OR p_time !~ '^\d{2}:\d{2}$' THEN
    p_time := '09:00';
  END IF;

  hh := split_part(p_time, ':', 1)::INTEGER;
  mm := split_part(p_time, ':', 2)::INTEGER;

  IF hh < 0 OR hh > 23 OR mm < 0 OR mm > 59 THEN
    hh := 9;
    mm := 0;
  END IF;

  -- IST (UTC+05:30) -> UTC
  total_minutes := ((hh * 60 + mm - 330) % 1440 + 1440) % 1440;

  RETURN format('%s %s * * *', (total_minutes % 60), (total_minutes / 60));
END;
$$;

-- Dynamic daily queue processing cron synced from site_settings.blog_schedule_time.
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
      url := 'https://fmnvxphifyqefyfykfft.supabase.co/functions/v1/process-blog-queue',
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

CREATE OR REPLACE FUNCTION public.handle_blog_schedule_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.key IN ('blog_schedule_time', 'blog_cron_secret') THEN
    PERFORM public.configure_blog_queue_cron();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_blog_queue_cron_on_settings ON public.site_settings;
CREATE TRIGGER trg_sync_blog_queue_cron_on_settings
AFTER INSERT OR UPDATE OF value ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_blog_schedule_settings_change();

-- Weak blog performance tracking for refresh queueing.
CREATE TABLE IF NOT EXISTS public.blog_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT current_date,
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  ctr NUMERIC(6, 5),
  avg_position NUMERIC(8, 3),
  sessions INTEGER NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  bounce_rate NUMERIC(6, 5),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blog_id, metric_date, source)
);

ALTER TABLE public.blog_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage blog performance metrics" ON public.blog_performance_metrics;
CREATE POLICY "Admins can manage blog performance metrics"
ON public.blog_performance_metrics
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS update_blog_performance_metrics_updated_at ON public.blog_performance_metrics;
CREATE TRIGGER update_blog_performance_metrics_updated_at
BEFORE UPDATE ON public.blog_performance_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.queue_weak_blogs_for_refresh(
  p_min_impressions INTEGER DEFAULT 150,
  p_min_ctr NUMERIC DEFAULT 0.015,
  p_max_avg_position NUMERIC DEFAULT 25,
  p_max_items INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  WITH metrics_30d AS (
    SELECT
      m.blog_id,
      SUM(COALESCE(m.impressions, 0)) AS impressions_30d,
      SUM(COALESCE(m.clicks, 0)) AS clicks_30d,
      AVG(NULLIF(m.avg_position, 0)) AS avg_position_30d,
      SUM(COALESCE(m.sessions, 0)) AS sessions_30d
    FROM public.blog_performance_metrics m
    WHERE m.metric_date >= (current_date - INTERVAL '30 days')::date
    GROUP BY m.blog_id
  ),
  weak_candidates AS (
    SELECT
      b.id,
      b.title,
      b.seo_keywords,
      m.impressions_30d,
      m.clicks_30d,
      CASE
        WHEN COALESCE(m.impressions_30d, 0) > 0
          THEN (COALESCE(m.clicks_30d, 0)::NUMERIC / m.impressions_30d::NUMERIC)
        ELSE NULL
      END AS ctr_30d,
      m.avg_position_30d
    FROM public.blogs b
    LEFT JOIN metrics_30d m ON m.blog_id = b.id
    WHERE b.is_published = true
      AND b.updated_at < now() - INTERVAL '30 days'
      AND (
        (
          COALESCE(m.impressions_30d, 0) >= p_min_impressions
          AND (
            COALESCE(
              CASE
                WHEN COALESCE(m.impressions_30d, 0) > 0
                  THEN (COALESCE(m.clicks_30d, 0)::NUMERIC / m.impressions_30d::NUMERIC)
                ELSE NULL
              END,
              0
            ) < p_min_ctr
            OR COALESCE(m.avg_position_30d, 999) > p_max_avg_position
          )
        )
        OR (
          COALESCE(m.sessions_30d, 0) < 75
          AND b.updated_at < now() - INTERVAL '60 days'
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blog_queue q
        WHERE q.source_blog_id = b.id
          AND q.status IN ('pending', 'generating', 'generated', 'review')
      )
    ORDER BY COALESCE(m.impressions_30d, 0) DESC, b.updated_at ASC
    LIMIT GREATEST(1, p_max_items)
  ),
  inserted AS (
    INSERT INTO public.blog_queue(topic, keywords, status, scheduled_date, queue_type, source_blog_id)
    SELECT
      wc.title,
      COALESCE(wc.seo_keywords, '{}'::TEXT[]),
      'pending',
      current_date,
      'refresh',
      wc.id
    FROM weak_candidates wc
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;

  RETURN v_inserted;
END;
$$;

-- Generic DB-backed function rate limiter for Edge Functions.
CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage function rate limits" ON public.function_rate_limits;
CREATE POLICY "Service role can manage function rate limits"
ON public.function_rate_limits
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_row public.function_rate_limits%ROWTYPE;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN false;
  END IF;

  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RETURN false;
  END IF;

  LOOP
    SELECT *
    INTO v_row
    FROM public.function_rate_limits
    WHERE rate_key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.function_rate_limits(rate_key, window_started_at, request_count, updated_at)
        VALUES (p_key, v_now, 1, v_now);
        RETURN true;
      EXCEPTION WHEN unique_violation THEN
        -- Retry if a concurrent request inserted first.
      END;
    ELSE
      IF v_row.window_started_at <= (v_now - make_interval(secs => p_window_seconds)) THEN
        UPDATE public.function_rate_limits
        SET window_started_at = v_now,
            request_count = 1,
            updated_at = v_now
        WHERE rate_key = p_key;
        RETURN true;
      ELSIF v_row.request_count < p_limit THEN
        UPDATE public.function_rate_limits
        SET request_count = v_row.request_count + 1,
            updated_at = v_now
        WHERE rate_key = p_key;
        RETURN true;
      ELSE
        UPDATE public.function_rate_limits
        SET updated_at = v_now
        WHERE rate_key = p_key;
        RETURN false;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.queue_weak_blogs_for_refresh(INTEGER, NUMERIC, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_weak_blogs_for_refresh(INTEGER, NUMERIC, NUMERIC, INTEGER) TO service_role;

-- Weekly refresh queueing cron.
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
      url := 'https://fmnvxphifyqefyfykfft.supabase.co/functions/v1/refresh-weak-blogs',
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

-- Ensure jobs are created/synced now.
SELECT public.configure_blog_queue_cron();
SELECT public.configure_blog_refresh_cron();
