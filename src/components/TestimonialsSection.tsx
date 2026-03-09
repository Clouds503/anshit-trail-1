import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fallbackTestimonials = [
  { name: "Priya Sharma", role: "Cloud Engineer at Google", content: "Clouds Trail transformed my career. The hands-on projects and placement support helped me land my dream job at Google within 3 months.", rating: 5 },
  { name: "Rahul Verma", role: "Data Scientist at Amazon", content: "The Data Science program was incredibly comprehensive. The mentors were industry veterans who provided real-world insights.", rating: 5 },
  { name: "Anita Desai", role: "Full Stack Dev at Microsoft", content: "I came from a non-tech background. The structured curriculum and supportive community made the transition smooth.", rating: 5 },
  { name: "Vikram Patel", role: "DevOps Engineer at Netflix", content: "Real CI/CD pipelines, Kubernetes hands-on, and mock interviews prepared me perfectly for top-tier companies.", rating: 5 },
  { name: "Sneha Reddy", role: "Security Analyst at Deloitte", content: "Outstanding training in ethical hacking. The lab sessions gave me the confidence to handle real security challenges.", rating: 5 },
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase();

const TestimonialsSection = () => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    company: "",
    rating: "5",
    content: "",
  });

  const { data: testimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("sort_order");
      return data && data.length > 0 ? data : null;
    },
  });

  const displayTestimonials = testimonials || fallbackTestimonials;

  const submitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.content.trim()) {
      toast.error("Please fill name, email, and testimonial.");
      return;
    }

    setSubmitting(true);
    const rating = Math.min(5, Math.max(1, Number(form.rating) || 5));

    const { error } = await (supabase as any).from("testimonials").insert({
      name: form.name.trim(),
      role: form.role.trim() || null,
      company: form.company.trim() || null,
      content: form.content.trim(),
      rating,
      submitter_email: form.email.trim(),
      source: "website",
      approval_status: "pending",
      is_active: false,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Failed to submit testimonial. Please try again.");
      return;
    }

    toast.success("Thank you. Your testimonial was submitted for admin review.");
    setForm({
      name: "",
      email: "",
      role: "",
      company: "",
      rating: "5",
      content: "",
    });
  };

  useEffect(() => {
    if (!carouselApi || displayTestimonials.length < 2) return;
    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 3500);
    return () => clearInterval(timer);
  }, [carouselApi, displayTestimonials.length]);

  return (
    <section id="testimonials" className="py-16 md:py-24">
      <div className="container">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Success Stories</p>
          <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Hear From Our Alumni</h2>
        </motion.div>

        <Carousel setApi={setCarouselApi} opts={{ align: "start", loop: true }} className="max-w-5xl mx-auto">
          <CarouselContent>
            {displayTestimonials.map((t, i) => (
              <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                <div className="bg-card rounded-lg border p-6 h-full flex flex-col">
                  <Quote className="h-7 w-7 text-primary/15 mb-3" />
                  <p className="text-foreground/70 text-sm leading-relaxed flex-1 mb-5">"{t.content}"</p>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {getInitials(t.name)}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 md:-left-12" />
          <CarouselNext className="-right-4 md:-right-12" />
        </Carousel>

        <motion.div
          className="mx-auto mt-10 max-w-4xl rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-4 space-y-2 text-center sm:mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Share Your Experience</p>
            <h3 className="text-2xl font-heading font-extrabold text-foreground">Leave A Testimonial</h3>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Your review will be visible publicly only after admin approval.
            </p>
          </div>

          <form onSubmit={submitTestimonial} className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Email *
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Role
                </label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Data Analyst"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Company
                </label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. ABC Tech"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Rating
                </label>
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very Good</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Needs Improvement</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Testimonial *
              </label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Share your learning and outcome experience..."
                rows={4}
                maxLength={900}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Submitting..." : "Submit Testimonial"}
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
