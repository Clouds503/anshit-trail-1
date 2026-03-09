
-- Blog queue table for scheduled posting
CREATE TABLE public.blog_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'published', 'failed')),
  scheduled_date DATE,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blog queue" ON public.blog_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_queue_updated_at
  BEFORE UPDATE ON public.blog_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add curriculum as modules for programs (structured)
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS syllabus_url TEXT;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]'::JSONB;
