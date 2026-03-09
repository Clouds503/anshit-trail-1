import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MarqueeBanner from "@/components/MarqueeBanner";
import PublicLongformContent from "@/components/PublicLongformContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

let razorpayScriptPromise: Promise<void> | null = null;

const ensureRazorpayScript = async () => {
  if ((window as any).Razorpay) return;
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  }).finally(() => {
    if ((window as any).Razorpay) return;
    razorpayScriptPromise = null;
  });

  return razorpayScriptPromise;
};

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
    name: "",
    email: "",
    phone: "",
    course: preselectedCourse,
    message: "",
    preferred_batch_time: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("programs")
        .select("id, title, price, slug, next_batch_date")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setPrograms(data);
    })();
  }, []);

  useEffect(() => {
    if (form.course && programs.length) {
      const found = programs.find((p: any) => p.title === form.course);
      setSelectedProgram(found || null);
    }
  }, [form.course, programs]);

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
      toast.success("Enrollment request submitted. We will contact you shortly.");
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
      await ensureRazorpayScript();
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
        theme: { color: "#0ea5e9" },
        handler: async (response: any) => {
          try {
            await supabase.functions.invoke("confirm-enrollment", {
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
          } catch {
            // keep UX success state even if confirmation response is delayed
          }
          setSubmitted(true);
          toast.success("Payment successful. Enrollment confirmed.");
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

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 16% 20%, rgba(56, 189, 248, 0.32), transparent 42%), radial-gradient(circle at 82% 5%, rgba(14, 165, 233, 0.24), transparent 33%)",
          }}
        />
        <motion.div
          className="pointer-events-none absolute -left-24 top-20 hidden h-72 w-72 rounded-full bg-sky-400/18 blur-3xl sm:block"
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-28 bottom-2 hidden h-80 w-80 rounded-full bg-cyan-300/14 blur-3xl sm:block"
          animate={{ x: [0, -20, 0], y: [0, 22, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        <div className="container relative py-10 sm:py-16 md:py-20 lg:py-24">
          <div className="grid items-start gap-7 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-5"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-xs sm:tracking-[0.22em]">
                Start Your Journey
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-heading font-black leading-tight sm:text-5xl lg:text-6xl">
                Enroll Now
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-lg md:text-xl">
                Choose your program, lock your preferred batch, and begin a structured learning path toward real career outcomes.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Enrollment Snapshot</p>
              <div className="mt-3 space-y-2.5">
                <div className="rounded-xl border border-white/15 bg-white/10 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Selected Program</p>
                  <p className="text-sm text-white/90">{form.course || "Select a program in the form"}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Program Fee</p>
                  <p className="text-sm text-white/90">
                    {selectedProgram?.price ? `INR ${Number(selectedProgram.price).toLocaleString()}` : "Visible after program selection"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Next Batch</p>
                  <p className="text-sm text-white/90">
                    {selectedProgram?.next_batch_date
                      ? new Date(selectedProgram.next_batch_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Shown after program selection"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="enroll-form" className="pb-8 md:pb-10">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border bg-card/70 p-4 shadow-sm sm:p-6 md:p-8"
          >
            {submitted && receipt ? (
              <div className="max-w-3xl mx-auto">
                <div className="mb-6 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-500" />
                  <h2 className="text-2xl font-heading font-extrabold text-foreground">Enrollment Confirmed</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Confirmation email and receipt details have been sent.</p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-4 sm:p-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Bill Number</span><span className="font-mono font-bold text-foreground">{receipt.bill_number}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Program</span><span className="font-medium text-foreground">{receipt.program}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Amount Paid</span><span className="font-bold text-green-600">INR {Number(receipt.amount).toLocaleString()}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Payment ID</span><span className="font-mono text-xs text-foreground">{receipt.payment_id}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Batch Time</span><span className="text-foreground">{receipt.batch_time}</span></div>
                  {receipt.next_batch_date ? (
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Next Batch</span><span className="text-foreground">{new Date(receipt.next_batch_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                  ) : null}
                </div>
              </div>
            ) : submitted ? (
              <div className="max-w-3xl mx-auto text-center py-4">
                <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" />
                <h2 className="text-2xl font-heading font-extrabold text-foreground">Enrollment Submitted</h2>
                <p className="mt-1 text-sm text-muted-foreground">Our team will contact you within 24 hours with next steps.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
                <div className="text-center mb-2 sm:mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Enrollment Form</p>
                  <h2 className="mt-2 text-2xl font-heading font-extrabold text-foreground sm:text-3xl">Tell Us Your Program Preference</h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Fill your details, choose program and preferred batch, then submit or pay to confirm.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-foreground text-sm">Full Name *</Label>
                    <Input placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Email *</Label>
                    <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1 h-11 rounded-lg" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-foreground text-sm">Phone *</Label>
                    <Input type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={15} className="mt-1 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Select Program *</Label>
                    <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Choose a program</option>
                      {programs.map((p: any) => (
                        <option key={p.title} value={p.title}>
                          {p.title}{p.price ? ` - INR ${Number(p.price).toLocaleString()}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground text-sm inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Preferred Batch Time *</Label>
                  <select value={form.preferred_batch_time} onChange={(e) => setForm({ ...form, preferred_batch_time: e.target.value })} className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select batch time</option>
                    {batchTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {selectedProgram?.next_batch_date ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">Next batch starts:</span>{" "}
                      {new Date(selectedProgram.next_batch_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ) : null}

                <div>
                  <Label className="text-foreground text-sm">Message (optional)</Label>
                  <Textarea placeholder="Any questions or preferences..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={500} className="mt-1 rounded-lg" rows={3} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="submit" disabled={submitting} className="h-12 rounded-lg bg-primary text-base font-semibold text-primary-foreground">
                    <GraduationCap className="mr-2 h-5 w-5" /> {submitting ? "Submitting..." : "Submit Enquiry"}
                  </Button>
                  {selectedProgram?.price ? (
                    <Button type="button" onClick={handlePayment} disabled={paying} variant="outline" className="h-12 rounded-lg border-primary text-base font-semibold text-primary">
                      <CreditCard className="mr-2 h-5 w-5" /> {paying ? "Processing..." : `Pay INR ${Number(selectedProgram.price).toLocaleString()}`}
                    </Button>
                  ) : (
                    <Button type="button" disabled variant="outline" className="h-12 rounded-lg text-base font-semibold">
                      Select Program To Pay
                    </Button>
                  )}
                </div>

                <p className="text-center text-xs text-muted-foreground">Your details are used only for enrollment processing and learner support.</p>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <PublicLongformContent variant="enroll" />

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default EnrollNow;
