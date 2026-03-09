-- Editable homepage banner content
CREATE TABLE IF NOT EXISTS public.top_banner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trust_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.top_banner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active top banner items" ON public.top_banner_items;
CREATE POLICY "Public can view active top banner items"
  ON public.top_banner_items
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage top banner items" ON public.top_banner_items;
CREATE POLICY "Admins can manage top banner items"
  ON public.top_banner_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view active trust partners" ON public.trust_partners;
CREATE POLICY "Public can view active trust partners"
  ON public.trust_partners
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage trust partners" ON public.trust_partners;
CREATE POLICY "Admins can manage trust partners"
  ON public.trust_partners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_top_banner_items_updated_at ON public.top_banner_items;
CREATE TRIGGER update_top_banner_items_updated_at
BEFORE UPDATE ON public.top_banner_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_trust_partners_updated_at ON public.trust_partners;
CREATE TRIGGER update_trust_partners_updated_at
BEFORE UPDATE ON public.trust_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.top_banner_items (text, sort_order, is_active)
SELECT v.text, v.sort_order, true
FROM (
  VALUES
    ('Limited Seats', 0),
    ('500+ Hiring Partners', 1),
    ('25,000+ Students Trained', 2),
    ('Admissions Open 2026', 3),
    ('100% Placement Assistance', 4),
    ('Free Demo Classes', 5)
) AS v(text, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.top_banner_items);

INSERT INTO public.trust_partners (name, sort_order, is_active)
SELECT v.name, v.sort_order, true
FROM (
  VALUES
    ('Google', 0),
    ('Microsoft', 1),
    ('Amazon', 2),
    ('IBM', 3),
    ('Oracle', 4),
    ('Cisco', 5),
    ('Infosys', 6),
    ('TCS', 7),
    ('Wipro', 8),
    ('HCL', 9),
    ('Accenture', 10),
    ('Deloitte', 11),
    ('Capgemini', 12),
    ('Cognizant', 13)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.trust_partners);
