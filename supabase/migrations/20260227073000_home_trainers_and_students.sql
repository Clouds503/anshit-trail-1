CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  mastery_program TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  program_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enrolled',
  status_on DATE,
  placed_at TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active trainers" ON public.trainers;
CREATE POLICY "Public can view active trainers"
ON public.trainers
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage trainers" ON public.trainers;
CREATE POLICY "Admins can manage trainers"
ON public.trainers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view active students" ON public.students;
CREATE POLICY "Public can view active students"
ON public.students
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_status_valid;

ALTER TABLE public.students
ADD CONSTRAINT students_status_valid
CHECK (status IN ('enrolled', 'completed'));

INSERT INTO public.trainers (name, image_url, mastery_program, sort_order, is_active)
VALUES
  ('Aarav Sharma', 'https://i.pravatar.cc/400?img=14', 'Salesforce Administration', 0, true),
  ('Ritika Verma', 'https://i.pravatar.cc/400?img=32', 'DevOps Engineering', 1, true),
  ('Kunal Mehta', 'https://i.pravatar.cc/400?img=52', 'Data Science and AI', 2, true);

INSERT INTO public.students (name, image_url, program_name, status, status_on, placed_at, sort_order, is_active)
VALUES
  ('Priya Nair', 'https://i.pravatar.cc/400?img=26', 'Salesforce Administration', 'completed', CURRENT_DATE - INTERVAL '75 days', 'Accenture', 0, true),
  ('Rohit Singh', 'https://i.pravatar.cc/400?img=48', 'DevOps Engineering', 'enrolled', CURRENT_DATE - INTERVAL '20 days', 'Not placed yet', 1, true),
  ('Sneha Kulkarni', 'https://i.pravatar.cc/400?img=37', 'Data Science and AI', 'completed', CURRENT_DATE - INTERVAL '130 days', 'TCS', 2, true),
  ('Aditya Rao', 'https://i.pravatar.cc/400?img=61', 'Cloud Computing', 'completed', CURRENT_DATE - INTERVAL '95 days', 'Infosys', 3, true);
