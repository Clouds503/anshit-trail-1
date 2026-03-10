import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  {
    key: "slug",
    label: "Short Code",
    type: "text",
    required: true,
    showInTable: true,
    placeholder: "sf-admin",
  },
  {
    key: "target_url",
    label: "Target URL / Path",
    type: "url",
    required: true,
    showInTable: true,
    placeholder: "/programs or https://example.com/page",
  },
  {
    key: "anchor_text",
    label: "Anchor Text",
    type: "text",
    showInTable: true,
    placeholder: "Salesforce Administration Training",
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    showInTable: false,
    placeholder: "Optional context for backlink usage.",
  },
  {
    key: "sort_order",
    label: "Sort Order",
    type: "number",
    defaultValue: 0,
    showInTable: true,
  },
  {
    key: "is_active",
    label: "Active",
    type: "boolean",
    defaultValue: true,
    showInTable: true,
  },
];

const ShortLinksAdmin = () => (
  <CrudTable title="Short URL Backlinks" tableName="short_links" fields={fields} orderBy="sort_order" />
);

export default ShortLinksAdmin;
