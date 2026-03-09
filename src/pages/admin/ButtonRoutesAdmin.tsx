import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const buttonKeyOptions = [
  { label: "Header LMS", value: "header_lms" },
  { label: "Header Mobile LMS", value: "header_mobile_lms" },
  { label: "Hero Primary CTA", value: "hero_primary_cta" },
  { label: "Hero Demo CTA", value: "hero_demo_cta" },
  { label: "Programs View More", value: "programs_view_more" },
  { label: "Trending View More", value: "trending_programs_view_more" },
  { label: "Blog View All", value: "blog_view_all" },
  { label: "CTA Section Primary", value: "cta_section_primary" },
  { label: "Contact Submit CTA", value: "contact_submit_cta" },
  { label: "Enroll Now CTA", value: "enroll_now_cta" },
];

const fields: CrudField[] = [
  { key: "button_key", label: "Button Key", type: "select", required: true, showInTable: true, options: buttonKeyOptions },
  { key: "route", label: "Route / URL", type: "url", required: true, showInTable: true },
  { key: "label", label: "Button Label", type: "text", showInTable: true },
];

const ButtonRoutesAdmin = () => <CrudTable title="Button Routes" tableName="button_routes" fields={fields} orderBy="button_key" />;
export default ButtonRoutesAdmin;
