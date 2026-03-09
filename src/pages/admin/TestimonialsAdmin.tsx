import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "name", label: "Name", type: "text", required: true, showInTable: true },
  { key: "submitter_email", label: "Submitter Email", type: "text", showInTable: true },
  { key: "role", label: "Role", type: "text", showInTable: true },
  { key: "company", label: "Company", type: "text", showInTable: true },
  { key: "content", label: "Testimonial", type: "textarea", required: true },
  { key: "rating", label: "Rating (1-5)", type: "number", defaultValue: 5, showInTable: true },
  {
    key: "approval_status",
    label: "Approval Status",
    type: "select",
    showInTable: true,
    defaultValue: "approved",
    options: [
      { label: "Approved", value: "approved" },
      { label: "Pending", value: "pending" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  { key: "admin_notes", label: "Admin Notes", type: "textarea", showInTable: false },
  { key: "source", label: "Source", type: "text", showInTable: true, defaultValue: "admin" },
  { key: "image_url", label: "Image URL", type: "url", showInTable: false },
  { key: "is_active", label: "Visible", type: "boolean", defaultValue: true, showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
];

const TestimonialsAdmin = () => <CrudTable title="Testimonials" tableName="testimonials" fields={fields} orderBy="sort_order" />;
export default TestimonialsAdmin;
