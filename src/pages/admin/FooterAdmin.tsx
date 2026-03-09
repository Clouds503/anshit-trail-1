import CrudTable, { CrudField } from "@/components/admin/CrudTable";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const sectionFields: CrudField[] = [
  { key: "title", label: "Section Title", type: "text", required: true, showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0, showInTable: true },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const linkFields: CrudField[] = [
  { key: "label", label: "Link Label", type: "text", required: true, showInTable: true },
  { key: "url", label: "URL", type: "url", required: true, showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const FooterAdmin = () => {
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "footer_bio").maybeSingle();
      if (!data) return;
      try {
        setBio(typeof data.value === "string" ? data.value : JSON.parse(data.value) || "");
      } catch {
        setBio(`${data.value || ""}`);
      }
    })();
  }, []);

  const saveBio = async () => {
    setSaving(true);
    await (supabase as any).from("site_settings").upsert({ key: "footer_bio", value: JSON.stringify(bio) }, { onConflict: "key" });
    toast.success("Footer bio updated");
    setSaving(false);
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-heading font-bold text-foreground sm:text-2xl">Footer Management</h1>

      <div className="mb-8 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="font-heading font-bold text-sm text-foreground mb-3">Footer Bio</h2>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mb-3" />
        <Button onClick={saveBio} disabled={saving} className="w-full sm:w-auto">{saving ? "Saving..." : "Save Bio"}</Button>
      </div>

      <div className="mb-8">
        <CrudTable title="Footer Sections" tableName="footer_sections" fields={sectionFields} orderBy="sort_order" />
      </div>

      <CrudTable title="Footer Links" tableName="footer_links" fields={[
        { key: "section_id", label: "Section ID", type: "text", required: true, showInTable: true },
        ...linkFields,
      ]} orderBy="sort_order" />
    </div>
  );
};

export default FooterAdmin;
