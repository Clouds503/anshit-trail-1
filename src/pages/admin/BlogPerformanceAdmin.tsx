import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "blog_id", label: "Blog ID", type: "text", required: true, showInTable: true },
  { key: "metric_date", label: "Metric Date (YYYY-MM-DD)", type: "text", required: true, showInTable: true },
  { key: "impressions", label: "Impressions", type: "number", defaultValue: 0, showInTable: true },
  { key: "clicks", label: "Clicks", type: "number", defaultValue: 0, showInTable: true },
  { key: "ctr", label: "CTR (0.015 = 1.5%)", type: "number", showInTable: true },
  { key: "avg_position", label: "Avg Position", type: "number", showInTable: true },
  { key: "sessions", label: "Sessions", type: "number", defaultValue: 0, showInTable: true },
  { key: "bounce_rate", label: "Bounce Rate (0.35 = 35%)", type: "number", showInTable: false },
  { key: "source", label: "Source", type: "text", defaultValue: "manual", showInTable: true },
];

const BlogPerformanceAdmin = () => (
  <CrudTable
    title="Blog Performance Metrics"
    tableName="blog_performance_metrics"
    fields={fields}
    orderBy="metric_date"
    ascending={false}
  />
);

export default BlogPerformanceAdmin;
