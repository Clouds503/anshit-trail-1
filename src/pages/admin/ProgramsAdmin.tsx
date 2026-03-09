import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Sparkles, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  buildMasterImagePrompt,
  generateImageFromPrompt,
  isImageUrlHealthy,
  uploadImageFileToCloudinary,
} from "@/lib/admin-image";
import { invokeAdminFunction } from "@/lib/edge-functions";

interface Program {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  duration: string;
  level: string;
  price: number;
  is_trending: boolean;
  is_active: boolean;
  sort_order: number;
  highlights: string[];
  modules: any[];
  syllabus_url: string;
}

const ProgramsAdmin = () => {
  const [data, setData] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [extractingSyllabus, setExtractingSyllabus] = useState<string | null>(null);
  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [syllabusTargetId, setSyllabusTargetId] = useState<string | null>(null);

  // Cloudinary upload
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingCardImageId, setGeneratingCardImageId] = useState<string | null>(null);
  const [fixingBroken, setFixingBroken] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);
  const [totalBroken, setTotalBroken] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any).from("programs").select("*").order("sort_order");
    setData(rows || []);
    setLoading(false);
  }, []);

  const triggerAutoIndex = async (payload: Record<string, any>) => {
    try {
      await invokeAdminFunction("index-content", {
        body: {
          table: "programs",
          ...payload,
        },
      });
    } catch (e) {
      console.error("auto-index error", e);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditItem(null);
    setForm({
      title: "", slug: "", short_description: "", description: "", image_url: "",
      duration: "", level: "", price: 0, is_trending: false, is_active: true,
      sort_order: 0, highlights: "", syllabus_url: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      ...item,
      highlights: Array.isArray(item.highlights) ? item.highlights.join(", ") : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, created_at, updated_at, modules, curriculum, syllabus_url, ...rest } = form;
    const payload = {
      ...rest,
      price: Number(form.price) || 0,
      sort_order: Number(form.sort_order) || 0,
      highlights: typeof form.highlights === "string" ? form.highlights.split(",").map((s: string) => s.trim()).filter(Boolean) : form.highlights,
      syllabus_url: form.syllabus_url || null,
    };

    let savedRow: Program | null = null;
    if (editItem) {
      const { data: row, error } = await (supabase as any).from("programs").update(payload).eq("id", editItem.id).select().single();
      if (error) toast.error("Failed to update");
      else {
        toast.success("Updated");
        savedRow = row;
      }
    } else {
      const { data: row, error } = await (supabase as any).from("programs").insert(payload).select().single();
      if (error) toast.error("Failed to create: " + error.message);
      else {
        toast.success("Created");
        savedRow = row;
      }
    }

    if (savedRow) await triggerAutoIndex(savedRow as unknown as Record<string, any>);

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await (supabase as any).from("programs").delete().eq("id", deleteId);
    toast.success("Deleted");
    setDeleteId(null);
    fetchData();
  };

  const generateContent = async (program: any) => {
    setGeneratingContent(program.id);
    try {
      try {
        const data = await invokeAdminFunction<any>("generate-program-content", {
          body: {
            program_id: program.id,
            title: program.title,
            description_seed: program.description || program.short_description || "",
          },
        });
        toast.success("Content & image generated!");
        fetchData();
      } catch (fnErr: any) {
        console.error("generate-program-content failed:", fnErr);
        toast.error(fnErr?.message || "Generation failed (edge function)");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate content");
    }
    setGeneratingContent(null);
  };

  const openSyllabusUpload = (programId: string) => {
    setSyllabusTargetId(programId);
    setSyllabusText("");
    setSyllabusDialogOpen(true);
  };

  const extractSyllabus = async () => {
    if (!syllabusText.trim() || !syllabusTargetId) { toast.error("Paste syllabus content"); return; }
    setExtractingSyllabus(syllabusTargetId);
    try {
      try {
        const data = await invokeAdminFunction<any>("extract-syllabus", {
          body: { syllabus_text: syllabusText, program_id: syllabusTargetId },
        });
        toast.success(`Extracted ${data?.modules?.length || 0} modules!`);
        setSyllabusDialogOpen(false);
        fetchData();
      } catch (fnErr: any) {
        console.error("extract-syllabus failed:", fnErr);
        toast.error(fnErr?.message || "Syllabus extraction failed (edge function)");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to extract syllabus");
    }
    setExtractingSyllabus(null);
  };

  const uploadImageToCloudinary = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const imageUrl = await uploadImageFileToCloudinary(file);
        setForm({ ...form, image_url: imageUrl });
        toast.success("Image uploaded!");
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
      setUploading(false);
    };
    input.click();
  };

  // uploads a PDF to the `syllabi` storage bucket (provisioned by Supabase migration)
  const uploadSyllabusPdf = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const filePath = `syllabi/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("syllabi")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const { data: publicData } = supabase.storage.from("syllabi").getPublicUrl(filePath);
        setForm({ ...form, syllabus_url: publicData.publicUrl });
        toast.success("Syllabus uploaded!");
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    };
    input.click();
  };

  // allows uploading directly from a program row without opening edit dialog
  // this variant uploads directly and updates the single program record
  const uploadSyllabusPdfForProgram = async (program: Program) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const filePath = `syllabi/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("syllabi")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const { data: publicData } = supabase.storage.from("syllabi").getPublicUrl(filePath);
        const { error: updErr } = await (supabase as any)
          .from("programs")
          .update({ syllabus_url: publicData.publicUrl })
          .eq("id", program.id);
        if (updErr) throw updErr;
        await triggerAutoIndex({ id: program.id, slug: program.slug });
        toast.success("PDF uploaded!");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    };
    input.click();
  };

  const generateProgramImage = async () => {
    const prompt = buildMasterImagePrompt({
      subject: `Program card for ${form.title || "IT course"}`,
      details: [form.short_description, form.description],
    });

    setGeneratingImage(true);
    try {
      const imageUrl = await generateImageFromPrompt(prompt, {
        width: 800,
        height: 450,
        uploadToCloudinary: true,
      });
      setForm({ ...form, image_url: imageUrl });
      toast.success("Image generated");
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
    }
    setGeneratingImage(false);
  };

  const generateCardImageFromProgram = async (program: Program) => {
    setGeneratingCardImageId(program.id);
    try {
      const prompt = buildMasterImagePrompt({
        subject: `Training program card for ${program.title}`,
        details: [program.short_description, program.description],
      });
      const imageUrl = await generateImageFromPrompt(prompt, {
        width: 800,
        height: 450,
        uploadToCloudinary: true,
      });

      const { error } = await (supabase as any).from("programs").update({ image_url: imageUrl }).eq("id", program.id);
      if (error) throw error;
      await triggerAutoIndex({ id: program.id, slug: program.slug });
      toast.success("Program card image generated");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate program card image");
    }
    setGeneratingCardImageId(null);
  };

  const fixBrokenImages = async () => {
    if (fixingBroken) return;
    setFixingBroken(true);
    setFixedCount(0);
    try {
      const items = data || [];
      const broken: Program[] = [];
      for (const p of items) {
        if (!p.image_url) {
          broken.push(p);
          continue;
        }
        if (!(await isImageUrlHealthy(p.image_url))) {
          broken.push(p);
        }
      }

      setTotalBroken(broken.length);
      for (const b of broken) {
        try {
          await generateCardImageFromProgram(b);
          setFixedCount((c) => c + 1);
        } catch (e: any) {
          console.error("Failed to fix image for", b.id, e);
        }
      }

      if (broken.length === 0) {
        toast.success("No broken images found");
      } else {
        toast.success(`Fixed ${fixedCount || broken.length} images`);
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to scan images");
    }
    setFixingBroken(false);
    setTotalBroken(0);
    setFixedCount(0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Programs</h1>
        <div className="flex items-center gap-2">
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add New</Button>
          <Button
            variant="outline"
            onClick={async () => {
              // lazy load handler reference
              await fixBrokenImages();
            }}
            disabled={fixingBroken}
            title="Scan programs and regenerate missing/broken images"
          >
            {fixingBroken ? `Fixing (${fixedCount}/${totalBroken})` : "Fix Broken Images"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No programs yet.</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Trending</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Syllabus</TableHead>
                <TableHead className="w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{item.slug}</TableCell>
                  <TableCell>{item.level || "—"}</TableCell>
                  <TableCell>{item.is_trending ? "✓" : "✗"}</TableCell>
                  <TableCell>{item.is_active ? "✓" : "✗"}</TableCell>
                  <TableCell>{Array.isArray(item.modules) ? item.modules.length : 0}</TableCell>
                  <TableCell>
                    {item.syllabus_url ? (
                      <a href={item.syllabus_url} target="_blank" className="text-xs text-blue-600 underline" rel="noreferrer">
                        PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => generateContent(item)} disabled={generatingContent === item.id} title="Auto-generate description & image">
                        <Sparkles className={`h-4 w-4 ${generatingContent === item.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openSyllabusUpload(item.id)} title="Extract Syllabus Text">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => uploadSyllabusPdfForProgram(item)} title="Upload Syllabus PDF">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateCardImageFromProgram(item)}
                        disabled={generatingCardImageId === item.id}
                        title="Generate 3D card image"
                      >
                        <Sparkles className={`h-4 w-4 ${generatingCardImageId === item.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>{editItem ? "Edit" : "Add"} Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Title *</label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Slug *</label>
              <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Short Description</label>
              <Textarea value={form.short_description || ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Description</label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Image</label>
              <div className="flex gap-2">
                <Input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL or upload" className="flex-1" />
                <Button type="button" variant="outline" onClick={uploadImageToCloudinary} disabled={uploading} size="sm">
                  <Upload className="h-4 w-4 mr-1" />{uploading ? "..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={generateProgramImage} disabled={generatingImage} size="sm">
                  <Sparkles className={`h-4 w-4 mr-1 ${generatingImage ? "animate-spin" : ""}`} />
                  {generatingImage ? "..." : "Generate"}
                </Button>
              </div>
              {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Duration</label>
                <Input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 6 Months" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Level</label>
                <select value={form.level || ""} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Select...</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Price</label>
                <Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Sort Order</label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Next Batch Date</label>
                <Input type="date" value={form.next_batch_date || ""} onChange={(e) => setForm({ ...form, next_batch_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Highlights (comma-separated)</label>
              <Input value={form.highlights || ""} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Syllabus PDF</label>
              <div className="flex gap-2">
                <Input
                  value={form.syllabus_url || ""}
                  readOnly
                  placeholder="Upload via button or paste URL"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={uploadSyllabusPdf}>
                  <Upload className="h-4 w-4 mr-1" />Upload
                </Button>
              </div>
              {form.syllabus_url && (
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={form.syllabus_url}
                    target="_blank"
                    className="text-xs text-primary underline"
                    rel="noreferrer"
                  >
                    View current file
                  </a>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setForm({ ...form, syllabus_url: "" })}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} />
                <label className="text-sm">Trending</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <label className="text-sm">Active</label>
              </div>
            </div>
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

      {/* Syllabus Text Extraction Dialog */}
      <Dialog open={syllabusDialogOpen} onOpenChange={setSyllabusDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Paste Syllabus Text</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Enter the syllabus or curriculum text below. AI will extract structured modules automatically.
          </p>
          <Textarea value={syllabusText} onChange={(e) => setSyllabusText(e.target.value)} rows={10} placeholder="Paste syllabus content here..." />
          <Button onClick={extractSyllabus} disabled={!!extractingSyllabus} className="w-full mt-3">
            <Sparkles className="h-4 w-4 mr-2" />{extractingSyllabus ? "Extracting modules..." : "Extract Modules from Syllabus"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramsAdmin;
