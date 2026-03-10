import { useState } from "react";
import CrudTable, { CrudField } from "@/components/admin/CrudTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navLinkFields: CrudField[] = [
  { key: "label", label: "Link Label", type: "text", required: true, showInTable: true },
  { key: "href", label: "Link URL", type: "url", required: true, showInTable: true, placeholder: "/about or https://..." },
  { key: "sort_order", label: "Sort Order", type: "number", showInTable: true, defaultValue: 0 },
  { key: "is_highlight", label: "Highlight Style", type: "boolean", showInTable: true, defaultValue: false },
  { key: "is_active", label: "Active", type: "boolean", showInTable: true, defaultValue: true },
];

const contactFields: CrudField[] = [
  {
    key: "contact_type",
    label: "Type",
    type: "select",
    required: true,
    showInTable: true,
    options: [
      { label: "Phone", value: "phone" },
      { label: "CTA Button", value: "cta" },
    ],
    defaultValue: "phone",
  },
  { key: "label", label: "Label", type: "text", required: true, showInTable: true, placeholder: "Call Us / LMS" },
  { key: "value", label: "Display Value", type: "text", required: true, showInTable: true, placeholder: "+91... / LMS" },
  { key: "href", label: "Action URL", type: "url", showInTable: true, placeholder: "tel:+91... or /enroll" },
  { key: "sort_order", label: "Sort Order", type: "number", showInTable: true, defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", showInTable: true, defaultValue: true },
];

const HeaderAdmin = () => {
  const [repairing, setRepairing] = useState(false);

  const ensureHeaderContacts = async () => {
    setRepairing(true);

    const { data: contacts, error } = await (supabase as any)
      .from("header_contacts")
      .select("contact_type");

    if (error) {
      toast.error(`Failed to check header contacts: ${error.message || "Unknown error"}`);
      setRepairing(false);
      return;
    }

    const existingTypes = new Set((contacts || []).map((row: any) => `${row.contact_type || ""}`));
    const missingRows: Array<{ contact_type: string; label: string; value: string; href: string; sort_order: number; is_active: boolean }> = [];

    if (!existingTypes.has("phone")) {
      missingRows.push({
        contact_type: "phone",
        label: "Call Us",
        value: "+91 92598 98397",
        href: "tel:+919259898397",
        sort_order: 0,
        is_active: true,
      });
    }

    if (!existingTypes.has("cta")) {
      missingRows.push({
        contact_type: "cta",
        label: "Enroll Now",
        value: "Enroll Now",
        href: "/enroll",
        sort_order: 1,
        is_active: true,
      });
    }

    if (missingRows.length === 0) {
      toast.success("Header contact types are already present.");
      setRepairing(false);
      return;
    }

    const { error: insertError } = await (supabase as any).from("header_contacts").insert(missingRows);
    if (insertError) {
      toast.error(`Failed to create missing rows: ${insertError.message || "Unknown error"}`);
    } else {
      toast.success("Missing header contact rows created.");
    }

    setRepairing(false);
  };

  return (
    <div className="space-y-10">
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p className="mb-3">
          Header navigation and CTA/phone entries are managed here. Logo size and site title are in Settings -&gt; Branding.
        </p>
        <Button type="button" variant="outline" onClick={ensureHeaderContacts} disabled={repairing}>
          {repairing ? "Repairing..." : "Repair Missing Phone/CTA Rows"}
        </Button>
      </div>
      <CrudTable title="Header Navigation Links" tableName="header_links" fields={navLinkFields} orderBy="sort_order" />
      <CrudTable title="Header Contact and CTA" tableName="header_contacts" fields={contactFields} orderBy="sort_order" />
    </div>
  );
};

export default HeaderAdmin;
