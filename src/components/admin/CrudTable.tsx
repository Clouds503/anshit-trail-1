import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildMasterImagePrompt, generateImageFromPrompt, uploadImageFileToCloudinary } from "@/lib/admin-image";
import { invokeAdminFunction } from "@/lib/edge-functions";

export interface CrudField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect" | "url" | "array";
  required?: boolean;
  options?: { label: string; value: string }[];
  showInTable?: boolean;
  defaultValue?: any;
  placeholder?: string;
}

interface CrudTableProps {
  title: string;
  tableName: string;
  fields: CrudField[];
  orderBy?: string;
  ascending?: boolean;
}

const CrudTable = ({ title, tableName, fields, orderBy = "created_at", ascending = true }: CrudTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  const tableFields = fields.filter((f) => f.showInTable !== false);
  const formFields = fields.filter((f) => f.key !== "id" && f.key !== "created_at" && f.key !== "updated_at");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any).from(tableName).select("*").order(orderBy, { ascending });
    if (error) toast.error("Failed to fetch data");
    else setData(rows || []);
    setLoading(false);
  }, [tableName, orderBy, ascending]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditItem(null);
    const defaults: Record<string, any> = {};
    formFields.forEach((f) => {
      defaults[f.key] =
        f.defaultValue ??
        (f.type === "boolean"
          ? false
          : f.type === "number"
            ? 0
            : f.type === "multiselect"
              ? []
              : f.type === "array"
                ? ""
                : "");
    });
    setForm(defaults);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const values: Record<string, any> = {};
    formFields.forEach((f) => {
      let val = item[f.key];
      if (f.type === "array" && Array.isArray(val)) val = val.join(", ");
      if (f.type === "multiselect") {
        if (Array.isArray(val)) val = val;
        else if (typeof val === "string" && val.trim()) val = val.split(",").map((s) => s.trim()).filter(Boolean);
        else val = [];
      }
      values[f.key] = val ?? (f.type === "boolean" ? false : "");
    });
    setForm(values);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = {};
    formFields.forEach((f) => {
      let val = form[f.key];
      if (f.type === "number") val = Number(val) || 0;
      if (f.type === "array" && typeof val === "string") val = val.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (f.type === "multiselect") {
        if (Array.isArray(val)) val = val.filter(Boolean);
        else if (typeof val === "string") val = val.split(",").map((s: string) => s.trim()).filter(Boolean);
        else val = [];
      }
      payload[f.key] = val;
    });

    if (tableName === "blogs") {
      payload.author = "Clouds Trail";
    }

    let savedRow: any = null;
    if (editItem) {
      const { data, error } = await (supabase as any)
        .from(tableName)
        .update(payload)
        .eq("id", editItem.id)
        .select()
        .single();
      if (error) toast.error("Failed to update");
      else {
        toast.success("Updated successfully");
        savedRow = data;
      }
    } else {
      const { data, error } = await (supabase as any)
        .from(tableName)
        .insert(payload)
        .select()
        .single();
      if (error) toast.error("Failed to create: " + error.message);
      else {
        toast.success("Created successfully");
        savedRow = data;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();

    // Trigger indexing for public content updates.
    if (savedRow && ["blogs", "programs", "page_content", "seo_settings", "top_banner_items", "trust_partners"].includes(tableName)) {
      try {
        await invokeAdminFunction("index-content", {
          body: {
            table: tableName,
            page_path: tableName === "top_banner_items" || tableName === "trust_partners" ? "/" : undefined,
            ...savedRow,
          },
        });
      } catch (e) {
        console.error("auto-index error", e);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from(tableName).delete().eq("id", deleteId);
    if (error) toast.error("Failed to delete");
    else toast.success("Deleted successfully");
    setDeleteId(null);
    fetchData();
  };

  const isImageField = (field: CrudField) =>
    field.type === "url" && /(image|hero|thumbnail|banner)/i.test(`${field.key} ${field.label}`);

  const handleImageUpload = (fieldKey: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingField(fieldKey);
      try {
        const url = await uploadImageFileToCloudinary(file);
        setForm((prev) => ({ ...prev, [fieldKey]: url }));
        toast.success("Image uploaded");
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      }
      setUploadingField(null);
    };
    input.click();
  };

  const handleImageGenerate = async (field: CrudField) => {
    const context = [
      form.title,
      form.page_title,
      form.name,
      form.subtitle,
      form.short_description,
      form.description,
      form.excerpt,
      form.hero_subtitle,
      form.mastery_program,
      form.program_name,
    ]
      .filter(Boolean)
      .join(" ");

    const prompt = buildMasterImagePrompt({
      subject: `${field.label} (${field.key})`,
      details: [context],
    });

    setGeneratingField(field.key);
    try {
      const width = /hero|banner/i.test(field.key) ? 1600 : 1200;
      const height = /hero|banner/i.test(field.key) ? 900 : 630;
      const url = await generateImageFromPrompt(prompt, { width, height, uploadToCloudinary: true });
      setForm((prev) => ({ ...prev, [field.key]: url }));
      toast.success("Image generated");
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
    }
    setGeneratingField(null);
  };

  const renderValue = (item: any, field: CrudField) => {
    const val = item[field.key];
    if (field.type === "boolean") return val ? "Yes" : "No";
    if (field.type === "array" && Array.isArray(val)) return val.join(", ");
    if (field.type === "multiselect" && Array.isArray(val)) {
      if (!field.options || field.options.length === 0) return val.join(", ");
      return val
        .map((entry: string) => field.options?.find((o) => o.value === entry)?.label || entry)
        .join(", ");
    }
    if (val === null || val === undefined) return "-";
    if (typeof val === "string" && val.length > 60) return `${val.slice(0, 60)}...`;
    return String(val);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add New</Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No items yet. Click "Add New" to create one.</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {tableFields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  {tableFields.map((f) => (
                    <TableCell key={f.key}>{renderValue(item, f)}</TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {formFields.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{f.label}{f.required && " *"}</label>
                {f.type === "textarea" ? (
                  <Textarea value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} rows={4} />
                ) : f.type === "boolean" ? (
                  <Switch checked={!!form[f.key]} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} />
                ) : f.type === "select" ? (
                  <select value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">Select...</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "multiselect" ? (
                  <div className="rounded-md border border-input bg-background p-3 space-y-2">
                    {f.options?.map((o) => {
                      const selectedValues = Array.isArray(form[f.key]) ? form[f.key] : [];
                      const checked = selectedValues.includes(o.value);
                      return (
                        <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const nextValues = Array.isArray(form[f.key]) ? [...form[f.key]] : [];
                              const shouldAdd = next === true;
                              const updated = shouldAdd
                                ? Array.from(new Set([...nextValues, o.value]))
                                : nextValues.filter((v: string) => v !== o.value);
                              setForm({ ...form, [f.key]: updated });
                            }}
                          />
                          <span>{o.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : f.type === "url" && isImageField(f) ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        placeholder={f.placeholder || f.label}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageUpload(f.key)}
                        disabled={uploadingField === f.key}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {uploadingField === f.key ? "Uploading..." : "Upload"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageGenerate(f)}
                        disabled={generatingField === f.key}
                      >
                        <Sparkles className={`h-4 w-4 mr-1 ${generatingField === f.key ? "animate-spin" : ""}`} />
                        {generatingField === f.key ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                    {form[f.key] ? (
                      <img src={form[f.key]} alt={f.label} className="h-24 w-full object-cover rounded border" />
                    ) : null}
                  </div>
                ) : (
                  <Input type={f.type === "number" ? "number" : "text"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder || f.label} />
                )}
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editItem ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrudTable;
