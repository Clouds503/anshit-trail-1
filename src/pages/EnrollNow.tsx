import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, CheckCircle2, Shield, Users, Award, CreditCard, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const benefits = [
  { icon: GraduationCap, text: "Industry-recognized certification" },
  { icon: Users, text: "100% placement assistance" },
  { icon: Shield, text: "7-day money-back guarantee" },
  { icon: Award, text: "Learn from 300+ industry experts" },
];

const batchTimes = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "7:00 PM - 9:00 PM",
];

const EnrollNow = () => {
  const [searchParams] = useSearchParams();
  const preselectedCourse = searchParams.get("course") || "";

  const [form, setForm] = useState({
    name: "", email: "", phone: "", course: preselectedCourse, message: "", preferred_batch_time: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("programs").select("id, title, price, slug, next_batch_date").eq("is_active", true).order("sort_order");
      if (data) setPrograms(data);
    })();
  }, []);

  useEffect(() => {
    if (form.course && programs.length) {
      const found = programs.find((p: any) => p.title === form.course);
      setSelectedProgram(found || null);
    }
  }, [form.course, programs]);

  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.course) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      program: form.course,
      lead_type: "enrollment",
      source_page: "enroll-now",
    });
    setSubmitting(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    // fire email notification
    const { data: emailData, error: emailError } = await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        program: form.course,
        leadType: "enrollment",
        sourcePage: "enroll-now",
      },
    });

    setSubmitted(true);
    if (emailError || (!emailData?.email?.admin?.sent && !emailData?.email?.user?.sent && !emailData?.success)) {
      toast.error("Enrollment submitted, but email delivery failed.");
    } else {
      toast.success("Enrollment request submitted! We'll contact you shortly.");
    }
  };

  const handlePayment = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.course) {
      toast.error("Please fill all required fields first");
      return;
    }
    if (!form.preferred_batch_time) {
      toast.error("Please select your preferred batch time");
      return;
    }
    if (!selectedProgram?.price) {
      toast.error("No price set for this program");
      return;
    }

    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: selectedProgram.price,
          program: form.course,
          program_id: selectedProgram.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          preferred_batch_time: form.preferred_batch_time,
          next_batch_date: selectedProgram.next_batch_date,
        },
      });

      if (error || !data?.order_id) throw new Error(data?.error || "Failed to create order");

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Clouds Trail",
        description: `Enrollment: ${form.course}`,
        order_id: data.order_id,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          // Confirm enrollment and send email
          try {
            const { data: confirmData } = await supabase.functions.invoke("confirm-enrollment", {
              body: {
                enrollment_id: data.enrollment_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
              },
            });
            setReceipt({
              bill_number: data.bill_number,
              program: form.course,
              amount: selectedProgram.price,
              payment_id: response.razorpay_payment_id,
              batch_time: form.preferred_batch_time,
              next_batch_date: selectedProgram.next_batch_date,
            });
          } catch {}
          setSubmitted(true);
          toast.success("Payment successful! Enrollment confirmed. Check your email for receipt.");
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    }
    setPaying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <MarqueeBanner items={["Admissions Open 2026", "Limited Seats", "100% Placement Assistance", "Live Projects"]} />
      <Header />

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Left - Info */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Start Your Journey</p>
              <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-4">Enroll Now</h1>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Take the first step towards a rewarding tech career. Fill out the enrollment form and our counselors will guide you through the process.
              </p>

              <div className="space-y-4 mb-8">
                {benefits.map((b) => (
                  <div key={b.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <b.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-foreground text-sm font-medium">{b.text}</span>
                  </div>
                ))}
              </div>

              {selectedProgram?.next_batch_date && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                    <Calendar className="h-4 w-4" /> Next Batch
                  </div>
                  <p className="text-foreground text-sm font-medium">
                    {new Date(selectedProgram.next_batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              <div className="bg-accent/50 rounded-lg p-5 border">
                <p className="text-sm text-foreground font-medium mb-1">💡 Need help choosing a program?</p>
                <p className="text-xs text-muted-foreground">Our counselors will help you pick the right program based on your background and career goals.</p>
              </div>
            </motion.div>

            {/* Right - Form or Receipt */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              {submitted && receipt ? (
                <div className="bg-card rounded-xl border p-8">
                  <div className="text-center mb-6">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-heading font-bold text-foreground mb-1">Enrollment Confirmed! 🎉</h2>
                    <p className="text-muted-foreground text-sm">A confirmation email with receipt has been sent.</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Bill Number</span><span className="font-mono font-bold text-foreground">{receipt.bill_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Program</span><span className="font-medium text-foreground">{receipt.program}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-bold text-green-600">₹{Number(receipt.amount).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment ID</span><span className="font-mono text-xs text-foreground">{receipt.payment_id}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Batch Time</span><span className="text-foreground">{receipt.batch_time}</span></div>
                    {receipt.next_batch_date && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Next Batch</span><span className="text-foreground">{new Date(receipt.next_batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                    )}
                  </div>
                </div>
              ) : submitted ? (
                <div className="bg-card rounded-xl border p-8 text-center">
                  <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-heading font-bold text-foreground mb-2">Enrollment Submitted!</h2>
                  <p className="text-muted-foreground text-sm">Our team will reach out to you within 24 hours with the next steps.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-7 space-y-4">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">Enrollment Form</h3>

                  <div>
                    <Label className="text-foreground text-sm">Full Name *</Label>
                    <Input placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Email *</Label>
                    <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Phone *</Label>
                    <Input type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={15} className="mt-1 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Select Program *</Label>
                    <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Choose a program</option>
                      {programs.map((p: any) => (
                        <option key={p.title} value={p.title}>
                          {p.title}{p.price ? ` — ₹${p.price.toLocaleString()}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Time */}
                  <div>
                    <Label className="text-foreground text-sm flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Preferred Batch Time *</Label>
                    <select value={form.preferred_batch_time} onChange={(e) => setForm({ ...form, preferred_batch_time: e.target.value })} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select batch time</option>
                      {batchTimes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {selectedProgram?.next_batch_date && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-xs text-foreground">
                        <span className="font-semibold">Next batch starts:</span> {new Date(selectedProgram.next_batch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-foreground text-sm">Message (optional)</Label>
                    <Textarea placeholder="Any questions or preferences..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={500} className="mt-1 rounded-lg" rows={3} />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground font-semibold h-12 rounded-lg text-base">
                      <GraduationCap className="mr-2 h-5 w-5" /> {submitting ? "Submitting..." : "Submit Enquiry"}
                    </Button>
                    {selectedProgram?.price && (
                      <Button type="button" onClick={handlePayment} disabled={paying} variant="outline" className="flex-1 h-12 rounded-lg text-base font-semibold border-primary text-primary">
                        <CreditCard className="mr-2 h-5 w-5" /> {paying ? "Processing..." : `Pay ₹${selectedProgram.price.toLocaleString()}`}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">🔒 Your data is secure and never shared with third parties.</p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default EnrollNow;
