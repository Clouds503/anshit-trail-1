import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "label", label: "Label", type: "text", required: true, showInTable: true },
  { key: "value", label: "Value", type: "number", required: true, showInTable: true },
  { key: "suffix", label: "Suffix", type: "text", defaultValue: "+", showInTable: true },
  { key: "icon", label: "Icon", type: "select", required: true, showInTable: true, options: [
    { label: "Users", value: "Users" },
    { label: "BookOpen", value: "BookOpen" },
    { label: "Award", value: "Award" },
    { label: "Building2", value: "Building2" },
    { label: "GraduationCap", value: "GraduationCap" },
    { label: "Briefcase", value: "Briefcase" },
  ]},
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
];

const StatsAdmin = () => <CrudTable title="Stats" tableName="stats" fields={fields} orderBy="sort_order" />;
export default StatsAdmin;
