import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadFormProps {
  program: string;
  leadType: "enrollment" | "syllabus_download" | "counselling";
  sourcePage?: string;
  downloadUrl?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const LeadCaptureForm = ({ program, leadType, sourcePage = "course-detail", downloadUrl, onClose, onSuccess }: LeadFormProps) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const downloadSyllabusOnSite = async (url: string) => {
    const safeProgramName = program
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `${safeProgramName || "course"}-syllabus.pdf`;

    const triggerDownload = (href: string) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Syllabus fetch failed: ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl);
      URL.revokeObjectURL(objectUrl);
      return true;
    } catch (err) {
      console.error("syllabus direct download failed", err);
      try {
        // Fallback without opening a new tab.
        triggerDownload(url);
        return true;
      } catch (fallbackErr) {
        console.error("syllabus fallback download failed", fallbackErr);
        return false;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      program,
      lead_type: leadType,
      source_page: sourcePage,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    // notify via email and surface errors instead of failing silently
    const { data: emailData, error: emailError } = await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        program,
        leadType,
        sourcePage,
        downloadUrl: downloadUrl || undefined,
      },
    });
    const emailSent = !emailError && (emailData?.email?.admin?.sent || emailData?.email?.user?.sent || emailData?.success);

    if (leadType === "syllabus_download") {
      if (downloadUrl) {
        const downloaded = await downloadSyllabusOnSite(downloadUrl);
        if (!downloaded) {
          toast.error("Could not download syllabus right now. Please try again.");
        } else if (emailSent) {
          toast.success("Syllabus download started. Check your email too.");
        } else {
          toast.error("Syllabus download started, but email could not be sent.");
        }
      } else {
        toast.error("Syllabus file is not available right now.");
      }
    } else {
      if (emailSent) toast.success("Thank you! We'll contact you shortly.");
      else toast.error("Enquiry submitted, but email could not be sent.");
    }

    onSuccess?.();
    onClose();
  };

  const isSyllabusDownload = leadType === "syllabus_download";
  const isCounselling = leadType === "counselling";
  const title = isSyllabusDownload
    ? "Download Syllabus"
    : isCounselling
      ? "Get Free Counselling"
      : "Enroll Now";
  const subtitle = isSyllabusDownload
    ? "Enter your details to download the syllabus"
    : isCounselling
      ? "Fill in your details and our counsellor will contact you"
      : "Fill in your details and our team will get in touch";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-lg border p-6 w-full max-w-md shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-heading font-bold text-lg text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-1">{program}</p>
        <p className="text-xs text-muted-foreground mb-5">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lead-name" className="text-foreground text-sm">Full Name</Label>
            <Input id="lead-name" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="mt-1 h-11 rounded-lg" />
          </div>
          <div>
            <Label htmlFor="lead-email" className="text-foreground text-sm">Email</Label>
            <Input id="lead-email" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="mt-1 h-11 rounded-lg" />
          </div>
          <div>
            <Label htmlFor="lead-phone" className="text-foreground text-sm">Phone Number</Label>
            <Input id="lead-phone" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={15} className="mt-1 h-11 rounded-lg" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-semibold h-11 rounded-lg">
            {submitting ? "Submitting..." : (isSyllabusDownload ? <>
              <Download className="mr-2 h-4 w-4" /> Download Syllabus
            </> : isCounselling ? "Request Counselling" : "Submit Enrollment")}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">Your data is secure and never shared.</p>
      </div>
    </div>
  );
};

export default LeadCaptureForm;

