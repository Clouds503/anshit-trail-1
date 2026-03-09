import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const contactKeys = [
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "address", label: "Address" },
  { key: "whatsapp", label: "WhatsApp Number" },
];

const ContactAdmin = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("contact_info").select("*");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.key] = d.value; });
        setValues(map);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const ck of contactKeys) {
      await (supabase as any).from("contact_info").upsert({ key: ck.key, value: values[ck.key] || "" }, { onConflict: "key" });
    }
    toast.success("Contact info updated");
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Contact Information</h1>
      <div className="bg-card border rounded-lg p-5 max-w-lg space-y-4">
        {contactKeys.map((ck) => (
          <div key={ck.key}>
            <label className="text-sm font-medium text-foreground mb-1 block">{ck.label}</label>
            <Input value={values[ck.key] || ""} onChange={(e) => setValues({ ...values, [ck.key]: e.target.value })} />
          </div>
        ))}
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
};

export default ContactAdmin;
