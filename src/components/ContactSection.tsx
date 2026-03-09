import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Send, MapPin, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SocialLinks from "@/components/SocialLinks";
import { useQuery } from "@tanstack/react-query";

const fallbackCourses = [
  "Cloud Computing", "Data Science & AI", "Data Engineering",
  "Cyber Security", "Full Stack Dev", "Data Analytics",
  "App Development", "DevOps", "Blockchain",
];

interface ContactSectionProps {
  compact?: boolean;
  sourcePage?: string;
  showSectionHeading?: boolean;
  hideMeta?: boolean;
  sectionClassName?: string;
  embedded?: boolean;
}

const ContactSection = ({
  compact,
  sourcePage = "homepage",
  showSectionHeading = true,
  hideMeta = false,
  sectionClassName = "",
  embedded = false,
}: ContactSectionProps) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", course: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: programs } = useQuery({
    queryKey: ["contact_form_programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("title")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data) return null;

      const titles = data
        .map((row) => (row.title || "").trim())
        .filter(Boolean);

      return Array.from(new Set(titles));
    },
  });

  const { data: contactInfo } = useQuery({
    queryKey: ["contact_info"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_info").select("*");
      if (error || !data) return null;
      const map: Record<string, string> = {};
      data.forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
  });

  const officeAddress = contactInfo?.address || "Noida, Uttar Pradesh, India";
  const phoneNumber = contactInfo?.phone || "+91 99999 99999";
  const emailAddress = contactInfo?.email || "info@cloudstrail.com";
  const courseOptions = programs?.length ? programs : fallbackCourses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.course) {
      toast.error("Please fill all fields");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      program: form.course,
      lead_type: "contact",
      source_page: sourcePage,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    // send emails to admin and user
    const { data: emailData, error: emailError } = await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        program: form.course,
        leadType: "contact",
        sourcePage,
      },
    });

    if (emailError || (!emailData?.email?.admin?.sent && !emailData?.email?.user?.sent && !emailData?.success)) {
      toast.error("Enquiry submitted, but email delivery failed.");
    } else {
      toast.success("Thank you! We'll get back to you shortly.");
    }
    setForm({ name: "", email: "", phone: "", course: "" });
  };

  if (compact) {
    return (
      <div>
        <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Get In Touch</p>
        <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground mb-6">Contact Us</h2>
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-3">
          <div>
            <Label htmlFor="c-name" className="text-foreground text-sm">Full Name</Label>
            <Input id="c-name" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1 h-10 rounded-lg" />
          </div>
          <div>
            <Label htmlFor="c-email" className="text-foreground text-sm">Email</Label>
            <Input id="c-email" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1 h-10 rounded-lg" />
          </div>
          <div>
            <Label htmlFor="c-phone" className="text-foreground text-sm">Phone</Label>
            <Input id="c-phone" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={15} className="mt-1 h-10 rounded-lg" />
          </div>
          <div>
            <Label htmlFor="c-course" className="text-foreground text-sm">Course Interest</Label>
            <select id="c-course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select a course</option>
              {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-semibold h-10 rounded-lg">
            <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending..." : "Send Enquiry"}
          </Button>
        </form>
      </div>
    );
  }

  const content = (
    <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
      <motion.form
        onSubmit={handleSubmit}
        className="bg-card rounded-lg border p-4 sm:p-7 space-y-4 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div>
          <Label htmlFor="c-name" className="text-foreground text-sm">Full Name</Label>
          <Input id="c-name" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1 h-11 rounded-lg" />
        </div>
        <div>
          <Label htmlFor="c-email" className="text-foreground text-sm">Email</Label>
          <Input id="c-email" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1 h-11 rounded-lg" />
        </div>
        <div>
          <Label htmlFor="c-phone" className="text-foreground text-sm">Phone</Label>
          <Input id="c-phone" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={15} className="mt-1 h-11 rounded-lg" />
        </div>
        <div>
          <Label htmlFor="c-course" className="text-foreground text-sm">Course Interest</Label>
          <select id="c-course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select a course</option>
            {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-semibold h-11 rounded-lg">
          <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending..." : "Send Enquiry"}
        </Button>
      </motion.form>

      {!hideMeta ? (
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xl md:text-2xl font-heading font-bold text-foreground text-center mb-6">Our Location & Contact</h3>
          <div className="grid sm:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: MapPin, title: "Our Office", desc: officeAddress },
              { icon: Phone, title: "Call Us", desc: phoneNumber },
              { icon: Mail, title: "Email Us", desc: emailAddress },
            ].map((item) => (
              <div key={item.title} className="bg-card border rounded-lg p-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-foreground text-sm">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <SocialLinks placement="contact" variant="contact" className="justify-center pt-6" />
        </motion.div>
      ) : null}
    </div>
  );

  if (embedded) return content;

  return (
    <section id="contact" className={`py-16 md:py-24 ${sectionClassName}`.trim()}>
      <div className="container">
        {showSectionHeading ? (
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Get In Touch</p>
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">Contact Us</h2>
          </motion.div>
        ) : null}
        {content}
      </div>
    </section>
  );
};

export default ContactSection;
