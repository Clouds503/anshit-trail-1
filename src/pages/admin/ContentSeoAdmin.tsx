import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Edit3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { invokeAdminFunction } from "@/lib/edge-functions";

type PageRow = {
  id: string;
  page_slug: string;
  page_title: string;
  hero_image_url: string | null;
  content: unknown;
  updated_at: string | null;
  is_active: boolean | null;
};

const blockCount = (content: unknown) => (Array.isArray(content) ? content.length : 0);

const ContentSeoAdmin = () => {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState("master");
  const [singlePage, setSinglePage] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("page_content")
      .select("id,page_slug,page_title,hero_image_url,content,updated_at,is_active")
      .order("page_slug");

    if (error) toast.error(error.message || "Failed to load content pages");
    setRows((data || []) as PageRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const triggerAutoIndex = async (payload: Record<string, any>) => {
    try {
      await invokeAdminFunction("index-content", { body: payload });
    } catch (e) {
      console.error("auto-index error", e);
    }
  };

  const runContentSeo = async (pageSlug?: string) => {
    setRunning(true);
    try {
      const target = pageSlug || singlePage.trim() || undefined;
      const data = await invokeAdminFunction<any>("auto-seo", {
        body: {
          level,
          single_page: target,
          enrich_content: true,
          changed_only: false,
          optimize_weak_first: false,
        },
      });
      toast.success(`Content SEO completed. Updated ${data?.enriched_count || 0} page(s).`);
      await triggerAutoIndex({
        table: "page_content",
        page_slug: target || undefined,
      });
      await fetchRows();
    } catch (e: any) {
      toast.error(e.message || "Content SEO failed");
    }
    setRunning(false);
  };

  const runMetaSeoOnly = async () => {
    setRunning(true);
    try {
      const target = singlePage.trim() || undefined;
      const data = await invokeAdminFunction<any>("auto-seo", {
        body: {
          level,
          single_page: target,
          enrich_content: false,
        },
      });
      toast.success(`SEO metadata generated for ${data?.count || 0} page(s).`);
      await triggerAutoIndex({
        table: "seo_settings",
        page_path: target || undefined,
      });
    } catch (e: any) {
      toast.error(e.message || "SEO generation failed");
    }
    setRunning(false);
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-heading font-bold text-foreground sm:text-2xl">Content SEO Automation</h1>

      <div className="mb-6 space-y-3 rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          This panel is for AI enrichment of page headings, subheadings, paragraphs and section images. Use <strong>Pages</strong> for manual editing.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
          >
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="master">Master</option>
          </select>
          <Input
            value={singlePage}
            onChange={(e) => setSinglePage(e.target.value)}
            placeholder="Optional page slug (home, about, programs...)"
            className="h-9 w-full text-sm sm:w-72"
          />
          <Button onClick={() => runContentSeo()} disabled={running} className="w-full sm:w-auto">
            <Sparkles className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            {running ? "Running..." : "Run Content SEO"}
          </Button>
          <Button onClick={runMetaSeoOnly} disabled={running} variant="outline" className="w-full sm:w-auto">
            SEO Metadata Only
          </Button>
          <Button onClick={fetchRows} variant="outline" size="icon" title="Refresh" className="w-full sm:w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No page content found.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Blocks</TableHead>
                <TableHead>Hero Image</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">/{row.page_slug}</TableCell>
                  <TableCell className="text-sm">{row.page_title}</TableCell>
                  <TableCell className="text-sm">{blockCount(row.content)}</TableCell>
                  <TableCell className="text-sm">{row.hero_image_url ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => runContentSeo(row.page_slug)} disabled={running}>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Enrich
                      </Button>
                      <Link to="/admin/pages">
                        <Button size="sm" variant="ghost">
                          <Edit3 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ContentSeoAdmin;
