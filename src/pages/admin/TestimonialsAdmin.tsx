import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "name", label: "Name", type: "text", required: true, showInTable: true },
  { key: "role", label: "Role", type: "text", showInTable: true },
  { key: "company", label: "Company", type: "text", showInTable: true },
  { key: "content", label: "Testimonial", type: "textarea", required: true },
  { key: "rating", label: "Rating (1-5)", type: "number", defaultValue: 5, showInTable: true },
  { key: "image_url", label: "Image URL", type: "url", showInTable: false },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
];

const TestimonialsAdmin = () => <CrudTable title="Testimonials" tableName="testimonials" fields={fields} orderBy="sort_order" />;
export default TestimonialsAdmin;
