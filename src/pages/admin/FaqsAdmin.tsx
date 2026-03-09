import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "question", label: "Question", type: "text", required: true, showInTable: true },
  { key: "answer", label: "Answer", type: "textarea", required: true },
  { key: "sub_answers", label: "Sub Answers (comma-separated)", type: "array", showInTable: false },
  { key: "category", label: "Category", type: "text", showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const FaqsAdmin = () => <CrudTable title="FAQs" tableName="faqs" fields={fields} orderBy="sort_order" />;
export default FaqsAdmin;
