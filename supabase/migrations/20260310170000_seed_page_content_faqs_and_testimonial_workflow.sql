-- Seed updated page content blocks for admin-managed editing.
INSERT INTO public.page_content (page_slug, page_title, hero_subtitle, content, is_active)
VALUES
(
  'home',
  'Launch Your Tech Career with Expert Training',
  'Practical, mentor-led programs designed for real hiring outcomes.',
  '[
    {"type":"heading","text":"Career-Focused IT Learning Roadmap","style":{"size":"4xl","bold":true}},
    {"type":"subheading","text":"Built for practical execution and measurable growth","style":{"size":"xl","bold":true}},
    {"type":"paragraph","text":"Clouds Trail helps learners move from theory to real implementation through structured modules, hands-on project execution, and mentor-guided feedback. The goal is to build confidence for interviews and workplace delivery, not just complete lessons."},
    {"type":"paragraph","text":"Every track is aligned to role expectations in Salesforce, Workday, cloud, devops, data, and software domains. Learners practice with implementation-focused exercises and build portfolio-ready outputs that prove practical capability."},
    {"type":"heading","text":"How To Use The Learning Journey","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"Start with foundations, then move to guided implementation, and finally production-style practice with revision loops. This sequence helps you retain concepts longer and communicate technical decisions clearly in interviews and team discussions."},
    {"type":"list","items":["Follow a weekly cycle: learn, implement, review, and present","Track outcomes with practical artifacts and implementation notes","Use mentor feedback to improve quality and reduce repeated mistakes","Build interview-ready explanations with real project context"]},
    {"type":"paragraph","text":"If your focus is long-term career growth, prioritize consistency over speed. Clear revision habits, practical repetition, and project quality are what convert learning effort into job-ready performance."}
  ]'::jsonb,
  true
),
(
  'programs',
  'Our Training Programs',
  'Industry-aligned tracks with project-first curriculum and placement support.',
  '[
    {"type":"heading","text":"Programs Designed For Real Job Roles","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"Each program follows a practical roadmap with foundations, guided labs, and execution milestones. Learners work on realistic workflows so they can handle production-oriented tasks with confidence."},
    {"type":"paragraph","text":"Instead of passive learning, every module is built around measurable outcomes such as project deliverables, implementation notes, and interview-level articulation."},
    {"type":"subheading","text":"What you gain","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Role-specific technical depth aligned with hiring demand","Project portfolio artifacts that demonstrate execution ability","Mentor review loops to improve quality and decision-making","Career transition support with interview and communication practice"]},
    {"type":"paragraph","text":"Choose the program that matches your current level and target role. The key is not only completion, but consistent applied execution that maps directly to job expectations."}
  ]'::jsonb,
  true
),
(
  'about',
  'About Clouds Trail',
  'Career-first IT training with practical execution and outcome-driven mentorship.',
  '[
    {"type":"heading","text":"Built To Bridge Learning And Employment","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"Clouds Trail was built to close the gap between course completion and job readiness. We focus on practical skill application, guided mentorship, and consistent execution standards."},
    {"type":"paragraph","text":"Our approach combines concept clarity, hands-on labs, and role-based preparation so learners can transition into technology careers with measurable confidence."},
    {"type":"subheading","text":"Core values","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Practical delivery over passive consumption","Mentor accountability and feedback-driven growth","Career outcomes through structured preparation","Industry relevance through updated learning frameworks"]},
    {"type":"paragraph","text":"The mission is simple: help learners build real capability, not only certificates. We invest in execution quality, communication clarity, and continuous improvement."}
  ]'::jsonb,
  true
),
(
  'contact',
  'Contact Us',
  'Talk to our team for role guidance, batch planning, and enrollment clarity.',
  '[
    {"type":"heading","text":"Get Expert Guidance For The Right Learning Path","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"Use this page to discuss your current background, target role, and learning timeline. Our team recommends a practical roadmap that aligns your effort with real hiring outcomes."},
    {"type":"paragraph","text":"You can request details on curriculum fit, batch schedules, fee options, and project depth expectations. We prioritize actionable clarity so you can plan confidently."},
    {"type":"subheading","text":"Before you submit","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Share your current experience level honestly","Mention your target role and expected timeline","Highlight any constraints around schedule or learning mode","Ask for a role-aligned recommendation, not generic guidance"]},
    {"type":"paragraph","text":"Once submitted, our team responds with practical next steps tailored to your goals and readiness level."}
  ]'::jsonb,
  true
),
(
  'blog',
  'Insights That Convert Learning Into Career Progress',
  'Practical guides, role explainers, and implementation-focused knowledge from Clouds Trail.',
  '[
    {"type":"heading","text":"Read With A Career-First Lens","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"This blog is a practical learning library. Use it to convert concepts into execution capability by reading in sequence: fundamentals, implementation, then advanced optimization."},
    {"type":"paragraph","text":"For better retention, apply one concept from each article in a practical task within the same week. Consistent application builds interview confidence and problem-solving depth."},
    {"type":"subheading","text":"Use each article as an action plan","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Extract a short execution checklist from each post","Document what changed after applying the concept","Link learnings to your portfolio and interview stories","Revisit previous topics after completing new ones"]},
    {"type":"paragraph","text":"The strongest outcomes come from repeated practical use, not passive reading. Treat every article as part of your role preparation cycle."}
  ]'::jsonb,
  true
),
(
  'enroll',
  'Enroll Now',
  'Choose your track, lock your batch, and start a structured career-focused journey.',
  '[
    {"type":"heading","text":"Enrollment Is The Start Of Execution","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"After enrollment, success depends on consistent learning rhythm. Set weekly outcomes, attend sessions regularly, and complete practical tasks with documented progress."},
    {"type":"paragraph","text":"To accelerate growth, pair each module with one practical output such as a mini-project, architecture note, workflow checklist, or implementation summary."},
    {"type":"subheading","text":"First 30 days framework","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Define measurable weekly learning targets","Practice with real scenarios, not only examples","Track mistakes and convert them into reusable checklists","Build concise explanations for interview communication"]},
    {"type":"paragraph","text":"Consistency, project depth, and communication practice are the combination that turns enrollment into career progression."}
  ]'::jsonb,
  true
),
(
  'terms',
  'Terms & Conditions',
  'Usage responsibilities, service boundaries, and policy expectations.',
  '[
    {"type":"heading","text":"Platform Use And Responsibilities","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"By using this website and related services, users agree to lawful and responsible usage. Program participation requires adherence to communication standards and operational guidelines."},
    {"type":"paragraph","text":"Enrollment, access, and support services are governed by defined terms that may be updated over time. Users are expected to review policy updates periodically."},
    {"type":"subheading","text":"Key policy areas","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Eligibility and enrollment expectations","Payment and service access boundaries","Code of conduct and acceptable usage","Operational updates and legal compliance"]},
    {"type":"paragraph","text":"For specific clarifications, contact the official support team before making enrollment or service decisions."}
  ]'::jsonb,
  true
),
(
  'privacy',
  'Privacy Policy',
  'How personal information is collected, used, protected, and governed.',
  '[
    {"type":"heading","text":"Data Collection And Protection Framework","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"We collect only the information required for service delivery, communication, enrollment support, and operational improvements. Data usage is aligned with legitimate educational and service purposes."},
    {"type":"paragraph","text":"Information security controls are applied to protect stored records and limit unauthorized access. Sensitive handling standards are maintained across operational workflows."},
    {"type":"subheading","text":"What users should know","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Scope of information collected and why it is needed","How data is used for support and service operations","How access is restricted and security is maintained","How users can request updates or clarifications"]},
    {"type":"paragraph","text":"For privacy-related requests, contact support through official channels. Policy updates may be published as operational standards evolve."}
  ]'::jsonb,
  true
),
(
  'refund',
  'Refund Policy',
  'Refund eligibility, request windows, and process expectations.',
  '[
    {"type":"heading","text":"Refund Eligibility And Process","style":{"size":"3xl","bold":true}},
    {"type":"paragraph","text":"Refund decisions are based on documented policy conditions, program stage, and request timelines. Learners should review the applicable terms before enrollment."},
    {"type":"paragraph","text":"Requests should include complete enrollment details and be submitted through official communication channels for timely review."},
    {"type":"subheading","text":"Important checkpoints","style":{"size":"lg","bold":true}},
    {"type":"list","items":["Eligibility criteria and applicable conditions","Submission timeline and required details","Processing flow and communication checkpoints","Non-refundable components where applicable"]},
    {"type":"paragraph","text":"For faster resolution, submit accurate information and keep payment and enrollment references ready during the request process."}
  ]'::jsonb,
  true
)
ON CONFLICT (page_slug) DO UPDATE
SET
  page_title = EXCLUDED.page_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Ensure FAQ sub-answers column exists.
ALTER TABLE public.faqs
ADD COLUMN IF NOT EXISTS sub_answers TEXT[] DEFAULT '{}'::TEXT[];

-- Seed / refresh FAQs so they can be edited via admin panel.
WITH faq_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'What are the admission requirements?',
        'Most programs do not require prior coding experience. Learners typically need basic graduation-level education and strong commitment to practical learning.',
        'General',
        0,
        ARRAY[
          'Freshers and working professionals can both apply.',
          'Program recommendations may vary by current skill level and target role.'
        ]::text[]
      ),
      (
        'Do you offer EMI or installment options?',
        'Yes. Flexible payment options are available for eligible programs to reduce upfront financial burden.',
        'Fees',
        1,
        ARRAY[
          'EMI availability may depend on program type and amount.',
          'Contact support for current payment plan eligibility.'
        ]::text[]
      ),
      (
        'What is your placement support model?',
        'Placement support includes resume and profile refinement, interview preparation, communication practice, and role-aligned opportunity guidance.',
        'Placement',
        2,
        ARRAY[
          'Support quality improves when learners maintain project and revision discipline.',
          'Career outcomes depend on skill readiness, consistency, and interview performance.'
        ]::text[]
      ),
      (
        'Are classes online or offline?',
        'Programs are offered in live online and classroom-supported formats depending on schedule and availability.',
        'Delivery',
        3,
        ARRAY[
          'Live sessions are mentor-led and practical in structure.',
          'Mode availability can vary by program and batch cycle.'
        ]::text[]
      ),
      (
        'Do I get a certificate after completion?',
        'Yes. Learners receive completion certification and guidance for role-relevant credential pathways where applicable.',
        'Certification',
        4,
        ARRAY[
          'Certification is tied to program completion requirements.',
          'Additional exam-based certifications may require external fees.'
        ]::text[]
      ),
      (
        'What if I miss a class?',
        'Missed sessions can be recovered through available support channels and structured revision guidance.',
        'Learning Support',
        5,
        ARRAY[
          'Stay aligned with assignments and mentor checkpoints.',
          'Prompt recovery helps maintain continuity and output quality.'
        ]::text[]
      ),
      (
        'Is there a refund policy?',
        'Yes. Refund requests are handled according to the published refund policy, eligibility conditions, and request timelines.',
        'Policies',
        6,
        ARRAY[
          'Submit complete enrollment details for faster processing.',
          'Review policy terms before enrollment decisions.'
        ]::text[]
      )
  ) AS t(question, answer, category, sort_order, sub_answers)
),
updated AS (
  UPDATE public.faqs f
  SET
    answer = s.answer,
    category = s.category,
    sort_order = s.sort_order,
    sub_answers = s.sub_answers,
    is_active = true
  FROM faq_seed s
  WHERE lower(f.question) = lower(s.question)
  RETURNING f.id
)
INSERT INTO public.faqs (question, answer, category, sort_order, sub_answers, is_active)
SELECT s.question, s.answer, s.category, s.sort_order, s.sub_answers, true
FROM faq_seed s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.faqs f
  WHERE lower(f.question) = lower(s.question)
);

-- Testimonial moderation workflow:
-- users can submit pending testimonials, admins can approve/reject/edit via admin panel.
ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS submitter_email TEXT;

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS submitter_phone TEXT;

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.testimonials
ADD COLUMN IF NOT EXISTS approved_by UUID;

ALTER TABLE public.testimonials
DROP CONSTRAINT IF EXISTS testimonials_approval_status_check;

ALTER TABLE public.testimonials
ADD CONSTRAINT testimonials_approval_status_check
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.testimonials
DROP CONSTRAINT IF EXISTS testimonials_rating_range_check;

ALTER TABLE public.testimonials
ADD CONSTRAINT testimonials_rating_range_check
CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

UPDATE public.testimonials
SET approval_status = 'approved'
WHERE approval_status IS NULL;

UPDATE public.testimonials
SET is_active = true
WHERE approval_status = 'approved' AND (is_active IS NULL OR is_active = false);

UPDATE public.testimonials
SET approved_at = COALESCE(approved_at, created_at)
WHERE approval_status = 'approved';

CREATE OR REPLACE FUNCTION public.sync_testimonial_visibility_from_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'approved' THEN
    NEW.is_active := true;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
  ELSE
    NEW.is_active := false;
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_testimonial_visibility_from_status ON public.testimonials;
CREATE TRIGGER sync_testimonial_visibility_from_status
BEFORE INSERT OR UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.sync_testimonial_visibility_from_status();

CREATE INDEX IF NOT EXISTS idx_testimonials_approval_visibility
ON public.testimonials (approval_status, is_active, sort_order);

DROP POLICY IF EXISTS "Public can view active testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials"
ON public.testimonials
FOR SELECT
TO anon, authenticated
USING (is_active = true AND approval_status = 'approved');

DROP POLICY IF EXISTS "Public can submit testimonials" ON public.testimonials;
CREATE POLICY "Public can submit testimonials"
ON public.testimonials
FOR INSERT
TO anon, authenticated
WITH CHECK (
  approval_status = 'pending'
  AND COALESCE(is_active, false) = false
);
