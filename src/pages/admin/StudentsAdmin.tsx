import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "name", label: "Name", type: "text", required: true, showInTable: true },
  { key: "image_url", label: "Image URL", type: "url", showInTable: true, placeholder: "Student profile image URL" },
  { key: "program_name", label: "Program", type: "text", required: true, showInTable: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    defaultValue: "enrolled",
    showInTable: true,
    options: [
      { label: "Enrolled", value: "enrolled" },
      { label: "Completed", value: "completed" },
    ],
  },
  { key: "status_on", label: "Enrolled/Completed On", type: "text", showInTable: true, placeholder: "YYYY-MM-DD" },
  { key: "placed_at", label: "Currently Placed At", type: "text", showInTable: true, placeholder: "Company name or Placement in progress" },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const StudentsAdmin = () => (
  <CrudTable title="Our Students" tableName="students" fields={fields} orderBy="sort_order" />
);

export default StudentsAdmin;
