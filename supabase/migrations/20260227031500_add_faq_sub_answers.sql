ALTER TABLE public.faqs
ADD COLUMN IF NOT EXISTS sub_answers TEXT[] DEFAULT '{}'::TEXT[];
