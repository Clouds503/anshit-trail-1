-- Auto-SEO v2 enhancements:
-- 1) Track page source hash for changed-only optimization.
-- 2) Add indexing queue table for deferred/observable indexing workflows.

ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_seo_settings_source_hash
  ON public.seo_settings(source_hash);

CREATE TABLE IF NOT EXISTS public.indexing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  page_url TEXT,
  source TEXT NOT NULL DEFAULT 'auto-seo',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indexing_queue
  DROP CONSTRAINT IF EXISTS indexing_queue_status_check;

ALTER TABLE public.indexing_queue
  ADD CONSTRAINT indexing_queue_status_check
  CHECK (status IN ('pending', 'processing', 'indexed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_indexing_queue_status_created_at
  ON public.indexing_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_indexing_queue_page_path
  ON public.indexing_queue(page_path);

ALTER TABLE public.indexing_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage indexing queue" ON public.indexing_queue;
CREATE POLICY "Admins can manage indexing queue"
ON public.indexing_queue
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can manage indexing queue" ON public.indexing_queue;
CREATE POLICY "Service role can manage indexing queue"
ON public.indexing_queue
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS update_indexing_queue_updated_at ON public.indexing_queue;
CREATE TRIGGER update_indexing_queue_updated_at
BEFORE UPDATE ON public.indexing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

