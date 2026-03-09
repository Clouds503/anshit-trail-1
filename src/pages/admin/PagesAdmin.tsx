import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { buildMasterImagePrompt, generateImageFromPrompt, uploadImageFileToCloudinary } from "@/lib/admin-image";
import { invokeAdminFunction } from "@/lib/edge-functions";

interface ContentBlock {
  type: "heading" | "subheading" | "paragraph" | "list" | "image";
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  style?: {
    size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    bold?: boolean;
    underline?: boolean;
  };
}

interface PageData {
  id: string;
  page_slug: string;
  page_title: string;
  hero_image_url: string;
  hero_subtitle: string;
  content: ContentBlock[];
  is_active: boolean;
}

const PagesAdmin = () => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [selected, setSelected] = useState<PageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // broken image fixer
  const [fixingBroken, setFixingBroken] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);
  const [totalBroken, setTotalBroken] = useState(0);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const { data } = await (supabase as any).from("page_content").select("*").order("page_slug");
    const mapped = (data || []).map((p: any) => ({ ...p, content: typeof p.content === "string" ? JSON.parse(p.content) : (p.content || []) }));
    setPages(mapped);
    return mapped as PageData[];
  };

  const triggerAutoIndex = async (payload: Record<string, any>) => {
    try {
      await invokeAdminFunction("index-content", {
        body: {
          table: "page_content",
          ...payload,
        },
      });
    } catch (e) {
      console.error("auto-index error", e);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageFileToCloudinary(file);
      return imageUrl;
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const generateImage = async (prompt: string, width = 1200, height = 630): Promise<string | null> => {
    setGeneratingImage(true);
    try {
      return await generateImageFromPrompt(prompt, { width, height, uploadToCloudinary: true });
    } catch (e: any) {
      toast.error(e.message || "Image generation failed");
      return null;
    } finally {
      setGeneratingImage(false);
    }
  };

  const repairBrokenImages = async () => {
    if (fixingBroken) return;
    setFixingBroken(true);
    setFixedCount(0);
    try {
      const pagesList = await loadPages();
      let broken = 0;
      for (const p of pagesList) {
        let needsUpdate = false;
        const updates: any = {};

        const checkUrl = async (url: string | null | undefined) => {
          if (!url) return false;
          try {
            const res = await fetch(url, { method: "HEAD" });
            return res.ok;
          } catch {
            return false;
          }
        };

        if (!(await checkUrl(p.hero_image_url))) {
          broken++;
          const prompt = buildMasterImagePrompt({
            subject: `Hero image for ${p.page_title}`,
            details: [p.hero_subtitle],
          });
          const url = await generateImageFromPrompt(prompt, { width: 1600, height: 900, uploadToCloudinary: true });
          updates.hero_image_url = url;
          needsUpdate = true;
        }

        if (Array.isArray(p.content)) {
          const newContent = [...p.content];
          for (let i = 0; i < newContent.length; i++) {
            const block = newContent[i] as ContentBlock;
            if (block.type === "image") {
              const good = await checkUrl(block.url);
              if (!good) {
                broken++;
                const prompt = buildMasterImagePrompt({
                  subject: `${p.page_title} page section image`,
                  details: [block.alt || p.hero_subtitle],
                });
                const url = await generateImageFromPrompt(prompt, { width: 1200, height: 630, uploadToCloudinary: true });
                newContent[i] = { ...block, url };
                needsUpdate = true;
              }
            }
          }
          if (needsUpdate) updates.content = newContent;
        }

        if (needsUpdate) {
          const { error } = await (supabase as any).from("page_content").update(updates).eq("id", p.id);
          if (!error) setFixedCount((c) => c + 1);
        }
      }
      setTotalBroken(broken);
      toast.success(`Checked ${broken} possible broken images, updated ${fixedCount}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to repair images");
    }
    setFixingBroken(false);
  };

  const savePage = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: savedRow, error } = await (supabase as any).from("page_content").upsert({
      id: selected.id,
      page_slug: selected.page_slug,
      page_title: selected.page_title,
      hero_image_url: selected.hero_image_url,
      hero_subtitle: selected.hero_subtitle,
      content: selected.content,
      is_active: selected.is_active,
    }, { onConflict: "page_slug" }).select().single();
    if (error) toast.error(error.message);
    else {
      toast.success("Page saved!");
      await triggerAutoIndex(savedRow || { page_slug: selected.page_slug });
      loadPages();
    }
    setSaving(false);
  };

  const generateSeoContent = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const data = await invokeAdminFunction<any>("auto-seo", {
        body: { level: "master", single_page: selected.page_slug, enrich_content: true },
      });
      const refreshed = await loadPages();
      const nextSelected = refreshed.find((p) => p.page_slug === selected.page_slug);
      if (nextSelected) setSelected(nextSelected);
      await triggerAutoIndex({ page_slug: selected.page_slug });
      toast.success(`SEO enriched. Updated ${data?.enriched_count || 0} page content record(s).`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    setGenerating(false);
  };

  const addBlock = (type: ContentBlock["type"]) => {
    if (!selected) return;
    const block: ContentBlock =
      type === "list"
        ? { type, items: [""] }
        : type === "image"
          ? { type, url: "", alt: "" }
          : { type, text: "", style: { size: type === "heading" ? "3xl" : type === "subheading" ? "xl" : "base", bold: type !== "paragraph", underline: false } };
    setSelected({ ...selected, content: [...selected.content, block] });
  };

  const updateBlock = (idx: number, updates: Partial<ContentBlock>) => {
    if (!selected) return;
    const content = [...selected.content];
    content[idx] = { ...content[idx], ...updates };
    setSelected({ ...selected, content });
  };

  const removeBlock = (idx: number) => {
    if (!selected) return;
    setSelected({ ...selected, content: selected.content.filter((_, i) => i !== idx) });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    if (!selected) return;
    const content = [...selected.content];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= content.length) return;
    [content[idx], content[newIdx]] = [content[newIdx], content[idx]];
    setSelected({ ...selected, content });
  };

  const buildBlockPrompt = (idx: number) => {
    if (!selected) return "";
    const block = selected.content[idx];
    const nearbyText = selected.content
      .slice(Math.max(0, idx - 2), Math.min(selected.content.length, idx + 3))
      .map((item) => ("text" in item ? item.text : undefined))
      .filter(Boolean)
      .join(" ");

    return buildMasterImagePrompt({
      subject: `${selected.page_title} page section image`,
      details: [
        selected.hero_subtitle,
        block?.alt,
        nearbyText,
      ],
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Page Content Manager</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Page list */}
        <div className="space-y-2">
          {pages.map((p) => (
            <button key={p.id} onClick={() => setSelected({ ...p })} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected?.id === p.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}>
              {p.page_title}
              <span className="block text-[10px] opacity-60">/{p.page_slug}</span>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected ? (
          <div className="md:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-foreground">{selected.page_title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={repairBrokenImages} disabled={fixingBroken}>
                  {fixingBroken ? `Fixing (${fixedCount}/${totalBroken})` : "Fix Broken Images"}
                </Button>
                <Button variant="outline" size="sm" onClick={generateSeoContent} disabled={generating}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />{generating ? "Generating..." : "Auto SEO Enrich"}
                </Button>
                <Button size="sm" onClick={savePage} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Page Title</label>
                <Input value={selected.page_title} onChange={(e) => setSelected({ ...selected, page_title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hero Subtitle</label>
                <Input value={selected.hero_subtitle || ""} onChange={(e) => setSelected({ ...selected, hero_subtitle: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Hero Image</label>
              <div className="flex gap-2 items-center">
                <Input value={selected.hero_image_url || ""} onChange={(e) => setSelected({ ...selected, hero_image_url: e.target.value })} placeholder="Image URL" className="flex-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadImage(file);
                    if (url) setSelected({ ...selected, hero_image_url: url });
                  }} />
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    <Upload className="h-3.5 w-3.5" /> {uploadingImage ? "Uploading..." : "Upload"}
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generatingImage}
                  onClick={async () => {
                    const prompt = buildMasterImagePrompt({
                      subject: `${selected.page_title} hero image`,
                      details: [selected.hero_subtitle],
                    });
                    const url = await generateImage(prompt, 1600, 900);
                    if (url) setSelected({ ...selected, hero_image_url: url });
                  }}
                >
                  <Sparkles className={`h-3.5 w-3.5 mr-1 ${generatingImage ? "animate-spin" : ""}`} />
                  {generatingImage ? "Generating..." : "Generate"}
                </Button>
              </div>
              {selected.hero_image_url && <img src={selected.hero_image_url} alt="Hero preview" className="h-24 mt-2 rounded-lg object-cover" />}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm text-foreground">Content Blocks</h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => addBlock("heading")}>+ Heading</Button>
                  <Button variant="outline" size="sm" onClick={() => addBlock("subheading")}>+ Subheading</Button>
                  <Button variant="outline" size="sm" onClick={() => addBlock("paragraph")}>+ Paragraph</Button>
                  <Button variant="outline" size="sm" onClick={() => addBlock("list")}>+ List</Button>
                  <Button variant="outline" size="sm" onClick={() => addBlock("image")}>+ Image</Button>
                </div>
              </div>

              <div className="space-y-3">
                {selected.content.map((block, idx) => (
                  <div key={idx} className="bg-muted/50 border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{block.type}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveBlock(idx, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => moveBlock(idx, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeBlock(idx)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {(block.type === "heading" || block.type === "subheading" || block.type === "paragraph") && (
                      block.type === "paragraph" ?
                        <Textarea value={block.text || ""} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={3} /> :
                        <Input value={block.text || ""} onChange={(e) => updateBlock(idx, { text: e.target.value })} />
                    )}
                    {(block.type === "heading" || block.type === "subheading" || block.type === "paragraph") && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <select
                          value={block.style?.size || (block.type === "heading" ? "3xl" : block.type === "subheading" ? "xl" : "base")}
                          onChange={(e) => updateBlock(idx, { style: { ...(block.style || {}), size: e.target.value as any } })}
                          className="h-9 px-2 rounded border bg-background text-xs"
                        >
                          <option value="sm">sm</option>
                          <option value="base">base</option>
                          <option value="lg">lg</option>
                          <option value="xl">xl</option>
                          <option value="2xl">2xl</option>
                          <option value="3xl">3xl</option>
                          <option value="4xl">4xl</option>
                        </select>
                        <label className="text-xs flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={!!block.style?.bold}
                            onChange={(e) => updateBlock(idx, { style: { ...(block.style || {}), bold: e.target.checked } })}
                          />
                          Bold
                        </label>
                        <label className="text-xs flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={!!block.style?.underline}
                            onChange={(e) => updateBlock(idx, { style: { ...(block.style || {}), underline: e.target.checked } })}
                          />
                          Underline
                        </label>
                      </div>
                    )}
                    {block.type === "list" && (
                      <div className="space-y-1">
                        {(block.items || []).map((item, j) => (
                          <div key={j} className="flex gap-1">
                            <Input value={item} onChange={(e) => {
                              const items = [...(block.items || [])];
                              items[j] = e.target.value;
                              updateBlock(idx, { items });
                            }} className="flex-1" />
                            <button onClick={() => {
                              const items = (block.items || []).filter((_, k) => k !== j);
                              updateBlock(idx, { items });
                            }} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => updateBlock(idx, { items: [...(block.items || []), ""] })}>+ Add item</Button>
                      </div>
                    )}
                    {block.type === "image" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input value={block.url || ""} onChange={(e) => updateBlock(idx, { url: e.target.value })} placeholder="Image URL" className="flex-1" />
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = await uploadImage(file);
                              if (url) updateBlock(idx, { url });
                            }} />
                            <span className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-muted rounded-lg hover:bg-muted/80">
                              <Upload className="h-3.5 w-3.5" /> {uploadingImage ? "Uploading..." : "Upload"}
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={generatingImage}
                            onClick={async () => {
                              const prompt = buildBlockPrompt(idx);
                              const url = await generateImage(prompt, 1200, 675);
                              if (url) updateBlock(idx, { url });
                            }}
                          >
                            <Sparkles className={`h-3.5 w-3.5 mr-1 ${generatingImage ? "animate-spin" : ""}`} />
                            {generatingImage ? "Generating..." : "Generate"}
                          </Button>
                        </div>
                        <Input value={block.alt || ""} onChange={(e) => updateBlock(idx, { alt: e.target.value })} placeholder="Alt text for SEO" />
                        {block.url && <img src={block.url} alt={block.alt || ""} className="h-20 rounded object-cover" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-3 flex items-center justify-center text-muted-foreground py-20">
            Select a page to edit
          </div>
        )}
      </div>
    </div>
  );
};

export default PagesAdmin;
