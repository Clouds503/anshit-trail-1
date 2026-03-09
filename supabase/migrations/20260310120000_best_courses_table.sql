-- Create best courses table to track which programs are featured in 3D slider
CREATE TABLE IF NOT EXISTS public.best_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id)
);

ALTER TABLE public.best_courses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active best courses" ON public.best_courses 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage best courses" ON public.best_courses 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_best_courses_active ON public.best_courses(is_active);
CREATE INDEX idx_best_courses_program ON public.best_courses(program_id);
