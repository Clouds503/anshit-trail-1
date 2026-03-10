import CrudTable, { CrudField } from "@/components/admin/CrudTable";

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
  return (
    <div className="space-y-10">
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Header navigation and CTA/phone entries are managed here. Logo size and site title are in Settings -&gt; Branding.
      </div>
      <CrudTable title="Header Navigation Links" tableName="header_links" fields={navLinkFields} orderBy="sort_order" />
      <CrudTable title="Header Contact and CTA" tableName="header_contacts" fields={contactFields} orderBy="sort_order" />
    </div>
  );
};

export default HeaderAdmin;
