import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "platform", label: "Platform", type: "select", required: true, showInTable: true, options: [
    { label: "Facebook", value: "facebook" },
    { label: "Twitter/X", value: "twitter" },
    { label: "Instagram", value: "instagram" },
    { label: "LinkedIn", value: "linkedin" },
    { label: "YouTube", value: "youtube" },
    { label: "GitHub", value: "github" },
    { label: "Telegram", value: "telegram" },
  ]},
  { key: "url", label: "URL", type: "url", required: true, showInTable: true },
  { key: "icon", label: "Icon Name", type: "text", required: true, showInTable: true, placeholder: "e.g. Facebook, Instagram, Linkedin" },
  {
    key: "display_in",
    label: "Display In",
    type: "multiselect",
    required: true,
    showInTable: true,
    defaultValue: ["footer"],
    options: [
      { label: "Header", value: "header" },
      { label: "Footer", value: "footer" },
      { label: "Contact Page", value: "contact" },
      { label: "About Page", value: "about" },
    ],
  },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const SocialLinksAdmin = () => <CrudTable title="Social Links" tableName="social_links" fields={fields} orderBy="sort_order" />;
export default SocialLinksAdmin;
