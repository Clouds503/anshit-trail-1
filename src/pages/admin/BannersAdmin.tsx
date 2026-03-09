import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const topBannerFields: CrudField[] = [
  { key: "text", label: "Banner Text", type: "text", required: true, showInTable: true, placeholder: "Admissions Open 2026" },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0, showInTable: true },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const trustCompanyFields: CrudField[] = [
  { key: "name", label: "Company Name", type: "text", required: true, showInTable: true, placeholder: "Google" },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0, showInTable: true },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const BannersAdmin = () => {
  return (
    <div className="space-y-10">
      <CrudTable title="Top Marquee Banner Items" tableName="top_banner_items" fields={topBannerFields} orderBy="sort_order" />
      <CrudTable title="Students Work At Banner Items" tableName="trust_partners" fields={trustCompanyFields} orderBy="sort_order" />
    </div>
  );
};

export default BannersAdmin;
