ALTER TABLE public.blogs
ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::JSONB;

INSERT INTO public.page_content (page_slug, page_title, hero_subtitle, content, is_active)
VALUES
(
  'home',
  'Clouds Trail Home',
  'Career-focused IT training with placement support',
  '[
    {"type":"heading","text":"Start Your Tech Career With Structured Learning","style":{"size":"4xl","bold":true,"underline":false}},
    {"type":"subheading","text":"Job-ready programs built for real hiring outcomes","style":{"size":"2xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Clouds Trail delivers practical, industry-aligned programs in cloud, DevOps, cybersecurity, data, and software engineering. Every learning path focuses on hands-on skills, portfolio projects, and interview readiness.","style":{"size":"base","bold":false,"underline":false}},
    {"type":"image","url":"https://gen.pollinations.ai/image/professional%20it%20training%20classroom%20with%20modern%20technology%20setup?width=1400&height=800&model=flux&nologo=true","alt":"Professional IT training classroom and mentorship environment"},
    {"type":"subheading","text":"Why students choose Clouds Trail","style":{"size":"xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Our programs combine instructor-led mentorship, guided labs, and career support. Students build deployable projects, improve problem-solving depth, and gain confidence to perform in technical interviews.","style":{"size":"base","bold":false,"underline":false}}
  ]'::JSONB,
  true
),
(
  'programs',
  'Our Training Programs',
  'Industry-aligned learning tracks with project-first curriculum',
  '[
    {"type":"heading","text":"Programs Designed For Real Job Roles","style":{"size":"3xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Each program is structured around role-specific outcomes so learners can move from theory to execution. You will work on real workflows used by companies and produce portfolio-ready deliverables.","style":{"size":"base","bold":false,"underline":false}},
    {"type":"image","url":"https://gen.pollinations.ai/image/modern%20technology%20career%20program%20cards%20layout%20with%20professional%20style?width=1400&height=800&model=flux&nologo=true","alt":"Program tracks with modern career-focused training themes"},
    {"type":"subheading","text":"Curriculum architecture","style":{"size":"xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Programs are divided into foundations, hands-on modules, and capstone projects. This layered structure improves concept retention and creates measurable progress toward interview readiness.","style":{"size":"base","bold":false,"underline":false}}
  ]'::JSONB,
  true
),
(
  'about',
  'About Clouds Trail',
  'India''s leading IT training and career acceleration institute',
  '[
    {"type":"heading","text":"Built To Bridge Learning And Employment","style":{"size":"3xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Clouds Trail was created to solve the gap between course completion and job readiness. We focus on applied learning, technical confidence, and career outcomes through project-led instruction.","style":{"size":"base","bold":false,"underline":false}},
    {"type":"image","url":"https://gen.pollinations.ai/image/high%20end%20educational%20institute%20team%20collaboration%20for%20technology%20training?width=1400&height=800&model=flux&nologo=true","alt":"Clouds Trail mentors and learners collaborating on technology projects"},
    {"type":"subheading","text":"Mission and long-term vision","style":{"size":"xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Our mission is to create job-ready professionals through practical skill development and guided mentorship. Our vision is to become the most trusted destination for technology career transformation.","style":{"size":"base","bold":false,"underline":false}}
  ]'::JSONB,
  true
),
(
  'contact',
  'Contact Us',
  'Talk to our academic and career support team',
  '[
    {"type":"heading","text":"Get Expert Guidance For The Right Learning Path","style":{"size":"3xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Our counselors help you evaluate your background, current skill level, and target role. You receive a practical roadmap, recommended program options, and timeline guidance.","style":{"size":"base","bold":false,"underline":false}},
    {"type":"image","url":"https://gen.pollinations.ai/image/professional%20career%20counselling%20session%20for%20it%20training%20students?width=1400&height=800&model=flux&nologo=true","alt":"Career counseling session for technology program applicants"},
    {"type":"subheading","text":"Admissions and support","style":{"size":"xl","bold":true,"underline":false}},
    {"type":"paragraph","text":"Use the contact form to request callbacks, fee details, batch schedules, or demo session access. Our team responds quickly with clear next steps.","style":{"size":"base","bold":false,"underline":false}}
  ]'::JSONB,
  true
)
ON CONFLICT (page_slug) DO UPDATE SET
  page_title = EXCLUDED.page_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = now();
