import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Sparkles, Eye, Pencil, Trash2, Plus, Search, Globe, Link2, Image, FileText } from "lucide-react";
import { invokeAdminFunction } from "@/lib/edge-functions";

interface SeoEntry {
  id: string;
  page_path: string;
  title: string;
  description: string;
  keywords: string[];
  og_image: string;
  canonical_url: string;
  auto_generated: boolean;
  focus_keyword: string;
  secondary_keywords: string[];
  schema_markup: any;
  alt_texts: any;
  internal_links: any[];
  heading_suggestions: any;
  indexing_enabled: boolean;
  robots_directive: string;
}

const SeoAdmin = () => {
  const [entries, setEntries] = useState<SeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [level, setLevel] = useState<string>("master");
  const [singlePage, setSinglePage] = useState("");
  const [changedOnly, setChangedOnly] = useState(true);
  const [optimizeWeakFirst, setOptimizeWeakFirst] = useState(true);
  const [maxIndexingPerRun, setMaxIndexingPerRun] = useState("25");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<SeoEntry | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const parseBooleanSetting = (value: any, fallback: boolean) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "boolean") return parsed;
        if (typeof parsed === "number") return parsed !== 0;
      } catch {
        // Keep fallback.
      }
    }
    return fallback;
  };

  const parseNumberSetting = (value: any, fallback: number) => {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const parsedNum = Number(parsed);
        if (Number.isFinite(parsedNum) && parsedNum > 0) return Math.floor(parsedNum);
      } catch {
        // Keep fallback.
      }
    }
    return fallback;
  };

  const fetchData = async () => {
    setLoading(true);
    const [seoRes, settingsRes] = await Promise.all([
      (supabase as any).from("seo_settings").select("*").order("page_path"),
      (supabase as any)
        .from("site_settings")
        .select("key,value")
        .in("key", ["seo_changed_only_default", "seo_optimize_weak_first_default", "seo_max_indexing_per_run_default"]),
    ]);

    setEntries(seoRes.data || []);

    const settingMap: Record<string, any> = {};
    (settingsRes.data || []).forEach((row: any) => {
      let parsed = row.value;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // Keep raw.
        }
      }
      settingMap[row.key] = parsed;
    });

    setChangedOnly(parseBooleanSetting(settingMap.seo_changed_only_default, true));
    setOptimizeWeakFirst(parseBooleanSetting(settingMap.seo_optimize_weak_first_default, true));
    setMaxIndexingPerRun(String(parseNumberSetting(settingMap.seo_max_indexing_per_run_default, 25)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const triggerAutoIndex = async (payload: Record<string, any>) => {
    try {
      await invokeAdminFunction("index-content", { body: payload });
    } catch (e) {
      console.error("auto-index error", e);
    }
  };

  const autoGenerateSeo = async (pagePath?: string) => {
    setGenerating(true);
    try {
      const indexingLimit = Math.min(Math.max(Number(maxIndexingPerRun) || 25, 1), 100);
      const data = await invokeAdminFunction<any>("auto-seo", {
        body: {
          level,
          single_page: pagePath || singlePage || undefined,
          changed_only: changedOnly,
          optimize_weak_first: optimizeWeakFirst,
          max_indexing_per_run: indexingLimit,
        },
      });
      const levelLabel = level ? `${level[0].toUpperCase()}${level.slice(1)}` : "SEO";
      const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : 0;
      const processedCount = Number.isFinite(Number(data?.processed_count)) ? Number(data.processed_count) : 0;
      const skippedUnchanged = Number.isFinite(Number(data?.skipped_unchanged)) ? Number(data.skipped_unchanged) : 0;
      const auditScore = Number(data?.technical_audit?.score);
      const auditScoreSuffix = Number.isFinite(auditScore) ? ` Technical audit: ${Math.round(auditScore)}/100.` : "";

      if (count === 0) {
        toast.success(
          `${levelLabel} SEO completed: 0 updated (up-to-date). Processed ${processedCount}, skipped unchanged ${skippedUnchanged}.${auditScoreSuffix}`,
        );
      } else {
        toast.success(
          `${levelLabel} SEO completed: updated ${count} page(s). Processed ${processedCount}, skipped unchanged ${skippedUnchanged}.${auditScoreSuffix}`,
        );
      }

      const findings = Array.isArray(data?.technical_audit?.findings) ? data.technical_audit.findings : [];
      const failedFindings = findings.filter((finding: any) => `${finding?.status || ""}`.toLowerCase() === "fail");
      if (failedFindings.length > 0) {
        const details = failedFindings
          .slice(0, 2)
          .map((finding: any) => `${finding?.id || finding?.category || "audit"}: ${finding?.message || "failed check"}`)
          .join(" | ");
        toast.warning(`Technical audit warning: ${failedFindings.length} failure(s). ${details}`);
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate SEO");
    }
    setGenerating(false);
  };

  const saveAutomationDefaults = async () => {
    setSavingAutomation(true);
    const indexingLimit = Math.min(Math.max(Number(maxIndexingPerRun) || 25, 1), 100);

    const payload = [
      { key: "seo_changed_only_default", value: JSON.stringify(changedOnly) },
      { key: "seo_optimize_weak_first_default", value: JSON.stringify(optimizeWeakFirst) },
      { key: "seo_max_indexing_per_run_default", value: JSON.stringify(indexingLimit) },
    ];

    const { error } = await (supabase as any).from("site_settings").upsert(payload, { onConflict: "key" });
    setSavingAutomation(false);
    if (error) {
      toast.error("Failed to save automation defaults");
      return;
    }

    setMaxIndexingPerRun(String(indexingLimit));
    toast.success("SEO automation defaults saved");
  };

  const openEdit = (item: SeoEntry) => {
    setEditItem(item);
    setForm({
      ...item,
      keywords: Array.isArray(item.keywords) ? item.keywords.join(", ") : "",
      secondary_keywords: Array.isArray(item.secondary_keywords) ? item.secondary_keywords.join(", ") : "",
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({
      page_path: "", title: "", description: "", keywords: "", og_image: "",
      canonical_url: "", focus_keyword: "", secondary_keywords: "",
      indexing_enabled: true, robots_directive: "index, follow",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      page_path: form.page_path,
      title: form.title,
      description: form.description,
      keywords: typeof form.keywords === "string" ? form.keywords.split(",").map((s: string) => s.trim()).filter(Boolean) : form.keywords,
      og_image: form.og_image,
      canonical_url: form.canonical_url,
      focus_keyword: form.focus_keyword,
      secondary_keywords: typeof form.secondary_keywords === "string" ? form.secondary_keywords.split(",").map((s: string) => s.trim()).filter(Boolean) : form.secondary_keywords,
      indexing_enabled: form.indexing_enabled,
      robots_directive: form.robots_directive,
    };

    if (editItem) {
      await (supabase as any).from("seo_settings").update(payload).eq("id", editItem.id);
      toast.success("Updated");
    } else {
      await (supabase as any).from("seo_settings").insert(payload);
      toast.success("Created");
    }
    await triggerAutoIndex({ table: "seo_settings", page_path: payload.page_path });
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    await (supabase as any).from("seo_settings").delete().eq("id", id);
    await triggerAutoIndex({ table: "seo_settings", page_path: target?.page_path });
    toast.success("Deleted");
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading font-bold text-foreground">🔍 Master SEO Engine</h1>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Page</Button>
      </div>

            {/* Controls */}
      <div className="bg-card border rounded-lg p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
            <option value="basic">Basic SEO</option>
            <option value="intermediate">Intermediate SEO</option>
            <option value="advanced">Advanced SEO</option>
            <option value="master">Master SEO</option>
          </select>
          <Input value={singlePage} onChange={(e) => setSinglePage(e.target.value)} placeholder="Page path (leave empty for all)" className="w-48 h-9 text-sm" />
          <div className="flex items-center gap-2 rounded-md border border-input px-2 h-9 bg-background">
            <span className="text-xs text-muted-foreground">Changed Only</span>
            <Switch checked={changedOnly} onCheckedChange={setChangedOnly} />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-input px-2 h-9 bg-background">
            <span className="text-xs text-muted-foreground">Weak First</span>
            <Switch checked={optimizeWeakFirst} onCheckedChange={setOptimizeWeakFirst} />
          </div>
          <Input
            value={maxIndexingPerRun}
            onChange={(e) => setMaxIndexingPerRun(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Max Indexing/Run"
            className="w-36 h-9 text-sm"
          />
          <Button onClick={saveAutomationDefaults} disabled={savingAutomation} variant="outline">
            {savingAutomation ? "Saving..." : "Save Defaults"}
          </Button>
          <Button onClick={() => autoGenerateSeo()} disabled={generating} className="bg-gradient-to-r from-primary to-purple-600 text-white">
            <Sparkles className="h-4 w-4 mr-2" />{generating ? "Generating..." : "Auto-Generate SEO"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Master mode:</strong> Focus keywords, LSI & long-tail keywords, schema markup (JSON-LD), alt texts, internal linking suggestions, heading optimization, voice search keywords, local SEO (India cities), robots directives, indexing control.
        </p>
      </div>
      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Focus KW</TableHead>
                <TableHead>Index</TableHead>
                <TableHead>AI</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.page_path}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.title || "—"}</TableCell>
                  <TableCell className="text-xs text-primary">{e.focus_keyword || "—"}</TableCell>
                  <TableCell>{e.indexing_enabled !== false ? <Globe className="h-4 w-4 text-green-500" /> : <Globe className="h-4 w-4 text-red-400" />}</TableCell>
                  <TableCell>{e.auto_generated ? "✓" : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setViewItem(e); setDetailOpen(true); }} title="View details"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => autoGenerateSeo(e.page_path)} disabled={generating} title="Regenerate"><Sparkles className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} SEO Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><label className="text-xs font-medium text-foreground">Page Path *</label><Input value={form.page_path || ""} onChange={(e) => setForm({ ...form, page_path: e.target.value })} placeholder="e.g. /, /about" /></div>
            <div><label className="text-xs font-medium text-foreground">SEO Title</label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">Meta Description</label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><label className="text-xs font-medium text-foreground">Keywords (comma-separated)</label><Input value={form.keywords || ""} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">Focus Keyword</label><Input value={form.focus_keyword || ""} onChange={(e) => setForm({ ...form, focus_keyword: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">Secondary Keywords</label><Input value={form.secondary_keywords || ""} onChange={(e) => setForm({ ...form, secondary_keywords: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">OG Image URL</label><Input value={form.og_image || ""} onChange={(e) => setForm({ ...form, og_image: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">Canonical URL</label><Input value={form.canonical_url || ""} onChange={(e) => setForm({ ...form, canonical_url: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-foreground">Robots Directive</label><Input value={form.robots_directive || "index, follow"} onChange={(e) => setForm({ ...form, robots_directive: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.indexing_enabled !== false} onCheckedChange={(v) => setForm({ ...form, indexing_enabled: v })} />
              <label className="text-xs">Allow Indexing</label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>SEO Details: {viewItem?.page_path}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4 mt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3"><label className="text-[10px] font-bold uppercase text-muted-foreground">Title</label><p className="text-foreground mt-1">{viewItem.title || "—"}</p></div>
                <div className="bg-muted/50 rounded-lg p-3"><label className="text-[10px] font-bold uppercase text-muted-foreground">Focus Keyword</label><p className="text-primary mt-1 font-medium">{viewItem.focus_keyword || "—"}</p></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3"><label className="text-[10px] font-bold uppercase text-muted-foreground">Description</label><p className="text-foreground mt-1">{viewItem.description || "—"}</p></div>
              <div className="bg-muted/50 rounded-lg p-3"><label className="text-[10px] font-bold uppercase text-muted-foreground">Keywords</label><div className="flex flex-wrap gap-1 mt-1">{(viewItem.keywords || []).map((k, i) => <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">{k}</span>)}</div></div>
              <div className="bg-muted/50 rounded-lg p-3"><label className="text-[10px] font-bold uppercase text-muted-foreground">Robots</label><p className="text-foreground mt-1 font-mono text-xs">{viewItem.robots_directive || "index, follow"}</p></div>

              {viewItem.alt_texts && Object.keys(viewItem.alt_texts).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Image className="h-3 w-3" /> Alt Texts</label>
                  <div className="mt-2 space-y-1">{Object.entries(viewItem.alt_texts).map(([k, v]) => <p key={k} className="text-xs"><span className="font-medium">{k}:</span> {String(v)}</p>)}</div>
                </div>
              )}

              {viewItem.internal_links && Array.isArray(viewItem.internal_links) && viewItem.internal_links.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Internal Links</label>
                  <div className="mt-2 space-y-1">{viewItem.internal_links.map((l: any, i: number) => <p key={i} className="text-xs"><span className="font-medium">{l.anchor_text}</span> → <span className="font-mono text-primary">{l.target_path}</span></p>)}</div>
                </div>
              )}

              {viewItem.heading_suggestions && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Heading Suggestions</label>
                  <p className="text-foreground mt-1 font-bold">{viewItem.heading_suggestions.h1}</p>
                  {viewItem.heading_suggestions.h2s?.map((h: string, i: number) => <p key={i} className="text-xs text-muted-foreground mt-1">H2: {h}</p>)}
                </div>
              )}

              {viewItem.schema_markup && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Schema Markup (JSON-LD)</label>
                  <pre className="text-xs text-foreground mt-1 overflow-x-auto max-h-40">{JSON.stringify(viewItem.schema_markup, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoAdmin;
