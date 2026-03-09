
-- Add next_batch_date to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS next_batch_date DATE;

-- Create enrollments table for tracking paid enrollments
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  program TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  preferred_batch_time TEXT NOT NULL,
  next_batch_date DATE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC DEFAULT 0,
  bill_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view enrollments" ON public.enrollments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add master SEO fields to seo_settings
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS schema_markup JSONB;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS alt_texts JSONB;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS internal_links JSONB;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS heading_suggestions JSONB;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[];
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS indexing_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS robots_directive TEXT DEFAULT 'index, follow';

-- Generate bill number sequence
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1001;
