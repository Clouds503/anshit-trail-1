-- Allow address as a supported header contact type.
ALTER TABLE public.header_contacts
DROP CONSTRAINT IF EXISTS header_contacts_type_valid;

ALTER TABLE public.header_contacts
ADD CONSTRAINT header_contacts_type_valid
CHECK (contact_type IN ('phone', 'address', 'cta'));

-- Seed a default address row when missing.
INSERT INTO public.header_contacts (contact_type, label, value, href, sort_order, is_active)
SELECT
  'address',
  'Visit Us',
  'Noida, Uttar Pradesh',
  'https://maps.google.com/?q=Noida%2C%20Uttar%20Pradesh',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.header_contacts
  WHERE contact_type = 'address'
);
