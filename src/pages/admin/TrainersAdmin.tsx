import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "name", label: "Name", type: "text", required: true, showInTable: true },
  { key: "mastery_program", label: "Master Of Program", type: "text", required: true, showInTable: true },
  { key: "image_url", label: "Image URL", type: "url", showInTable: true, placeholder: "Trainer profile image URL" },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const TrainersAdmin = () => (
  <CrudTable title="Our Trainers" tableName="trainers" fields={fields} orderBy="sort_order" />
);

export default TrainersAdmin;
