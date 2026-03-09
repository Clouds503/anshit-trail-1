
-- Page content table for managing all static pages (About, Contact, Privacy, Terms, Refund, Programs listing)
CREATE TABLE public.page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL UNIQUE,
  page_title TEXT NOT NULL,
  hero_image_url TEXT,
  hero_subtitle TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active page content" ON public.page_content FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage page content" ON public.page_content FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current page data
INSERT INTO public.page_content (page_slug, page_title, hero_subtitle, content) VALUES
('about', 'About Clouds Trail', 'India''s Leading IT Training Institute', '[
  {"type":"paragraph","text":"Clouds Trail is India''s leading IT training institute dedicated to transforming careers through industry-aligned certification programs. Founded with a vision to bridge the gap between education and employment, we have trained over 25,000+ students and partnered with 500+ hiring companies."},
  {"type":"heading","text":"Our Mission"},
  {"type":"paragraph","text":"To empower students and working professionals with cutting-edge technology skills, hands-on project experience, and career-focused placement support that leads to meaningful employment in the tech industry."},
  {"type":"heading","text":"Our Vision"},
  {"type":"paragraph","text":"To become the most trusted and accessible IT training platform in India, producing job-ready professionals who can thrive in the rapidly evolving technology landscape."},
  {"type":"heading","text":"Why Choose Us?"},
  {"type":"list","items":["Expert Trainers: 300+ industry professionals with 10+ years of experience","Live Projects: Work on real-world projects during the course","Placement Support: 95%+ placement rate with top MNCs","Flexible Learning: Online & offline modes with weekend batches","Certifications: Industry-recognized certificates and exam preparation","Lifetime Access: Course materials available for lifetime reference"]},
  {"type":"heading","text":"Our Achievements"},
  {"type":"list","items":["25,000+ students trained and placed","500+ corporate hiring partners","ISO 9001:2015 certified institute","NASSCOM member organization","Government recognized training center","4.9/5 average student rating"]}
]'::jsonb),
('privacy', 'Privacy Policy', 'Last updated: February 2026', '[
  {"type":"heading","text":"1. Information We Collect"},
  {"type":"paragraph","text":"We collect personal information that you provide to us, including: name, email address, phone number, course interest, and any other information you choose to provide through our forms."},
  {"type":"heading","text":"2. How We Use Your Information"},
  {"type":"paragraph","text":"We use the information to: process your enrollment, provide course-related communications, send relevant updates and offers, improve our services, and provide placement assistance."},
  {"type":"heading","text":"3. Data Sharing"},
  {"type":"paragraph","text":"We do not sell your personal data. We may share your information with hiring partners solely for placement purposes, and only with your consent."},
  {"type":"heading","text":"4. Data Security"},
  {"type":"paragraph","text":"We implement industry-standard security measures to protect your personal information."},
  {"type":"heading","text":"5. Cookies"},
  {"type":"paragraph","text":"Our website uses cookies to enhance your browsing experience. You can disable cookies in your browser settings."},
  {"type":"heading","text":"6. Your Rights"},
  {"type":"paragraph","text":"You have the right to access, update, or delete your personal information. Contact us at info@cloudstrail.com."},
  {"type":"heading","text":"7. Changes to This Policy"},
  {"type":"paragraph","text":"We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page."}
]'::jsonb),
('terms', 'Terms & Conditions', 'Last updated: February 2026', '[
  {"type":"heading","text":"1. Acceptance of Terms"},
  {"type":"paragraph","text":"By accessing and using the Clouds Trail website and services, you agree to be bound by these Terms and Conditions."},
  {"type":"heading","text":"2. Services"},
  {"type":"paragraph","text":"Clouds Trail provides IT training courses, certification programs, and placement assistance services."},
  {"type":"heading","text":"3. Enrollment"},
  {"type":"paragraph","text":"Enrollment is confirmed only after full payment or acceptance of an EMI plan. Seats are allocated on a first-come, first-served basis."},
  {"type":"heading","text":"4. Payment"},
  {"type":"paragraph","text":"All fees must be paid according to the chosen payment plan."},
  {"type":"heading","text":"5. Intellectual Property"},
  {"type":"paragraph","text":"All course materials and content are the intellectual property of Clouds Trail."},
  {"type":"heading","text":"6. Placement Assistance"},
  {"type":"paragraph","text":"Clouds Trail provides placement assistance, not a guarantee of employment."},
  {"type":"heading","text":"7. Code of Conduct"},
  {"type":"paragraph","text":"Students are expected to maintain professional conduct during classes and interactions."},
  {"type":"heading","text":"8. Limitation of Liability"},
  {"type":"paragraph","text":"Clouds Trail shall not be liable for any indirect, incidental, or consequential damages."},
  {"type":"heading","text":"9. Contact"},
  {"type":"paragraph","text":"For questions, contact us at info@cloudstrail.com or call +91 99999 99999."}
]'::jsonb),
('refund', 'Refund Policy', 'Last updated: February 2026', '[
  {"type":"heading","text":"1. 7-Day Money-Back Guarantee"},
  {"type":"paragraph","text":"If you are not satisfied with the course within the first 7 days of enrollment, you may request a full refund."},
  {"type":"heading","text":"2. After 7 Days"},
  {"type":"paragraph","text":"After the 7-day period, no refunds will be issued. However, you may transfer your enrollment to another batch."},
  {"type":"heading","text":"3. Course Cancellation by Clouds Trail"},
  {"type":"paragraph","text":"If Clouds Trail cancels a course, students will receive a full refund or transfer option."},
  {"type":"heading","text":"4. EMI Plans"},
  {"type":"paragraph","text":"For students on EMI plans, refunds apply only to the amount paid."},
  {"type":"heading","text":"5. Non-Refundable Items"},
  {"type":"paragraph","text":"Registration fees, certification exam fees, and dispatched materials are non-refundable."},
  {"type":"heading","text":"6. How to Request a Refund"},
  {"type":"paragraph","text":"Email us at info@cloudstrail.com with your enrollment details."}
]'::jsonb),
('contact', 'Contact Us', 'Get in touch with our team', '[]'::jsonb);

-- Add trigger for updated_at
CREATE TRIGGER update_page_content_updated_at
  BEFORE UPDATE ON public.page_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
