import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseMarkdownToBlocks } from "@/lib/blog-content";
import { buildMasterImagePrompt, generateImageFromPrompt } from "@/lib/admin-image";
import { invokeAdminFunction } from "@/lib/edge-functions";

type BlockType = "heading" | "subheading" | "paragraph" | "points" | "image";
type BlockStyle = {
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  bold?: boolean;
  underline?: boolean;
};

type TypographyBlock = {
  type: BlockType;
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  style?: BlockStyle;
};

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  is_published: boolean | null;
  content: string | null;
  content_blocks?: TypographyBlock[] | null;
};

const defaultStyle = (type: BlockType): BlockStyle => ({
  size: type === "heading" ? "3xl" : type === "subheading" ? "xl" : "base",
  bold: type !== "paragraph",
  underline: false,
});

const normalizeBlocks = (raw: any): TypographyBlock[] => {
  if (Array.isArray(raw) && raw.length > 0) return raw as TypographyBlock[];
  return [];
};

const fromMarkdown = (content: string): TypographyBlock[] => {
  const parsed = parseMarkdownToBlocks(content || "");
  return parsed.map((block) => {
    if (block.type === "heading") {
      return {
        type: block.level <= 2 ? "heading" : "subheading",
        text: block.text,
        style: defaultStyle(block.level <= 2 ? "heading" : "subheading"),
      };
    }
    if (block.type === "paragraph") {
      return { type: "paragraph", text: block.text, style: defaultStyle("paragraph") };
    }
    if (block.type === "list") {
      return { type: "points", items: block.items || [] };
    }
    return { type: "image", url: block.src, alt: block.alt || "" };
  });
};

const buildMarkdown = (blocks: TypographyBlock[]) => {
  return blocks
    .map((b) => {
      if (b.type === "heading") return `## ${b.text || ""}`;
      if (b.type === "subheading") return `### ${b.text || ""}`;
      if (b.type === "paragraph") return b.text || "";
      if (b.type === "points") return (b.items || []).map((i) => `- ${i}`).join("\n");
      if (b.type === "image" && b.url) return `![${b.alt || "Blog image"}](${b.url})`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
};

const BlogTypographyAdmin = () => {
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [blocks, setBlocks] = useState<TypographyBlock[]>([]);
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [generatingBlockIdx, setGeneratingBlockIdx] = useState<number | null>(null);

  const selected = useMemo(() => blogs.find((b) => b.id === selectedId) || null, [blogs, selectedId]);

  const loadBlogs = async () => {
    const { data, error } = await (supabase as any)
      .from("blogs")
      .select("id,title,slug,excerpt,image_url,is_published,content,content_blocks")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message || "Failed to load blogs");
      return;
    }
    setBlogs((data || []) as BlogRow[]);
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setSlug(selected.slug || "");
    setExcerpt(selected.excerpt || "");
    setImageUrl(selected.image_url || "");
    setIsPublished(!!selected.is_published);
    const fromDb = normalizeBlocks(selected.content_blocks);
    setBlocks(fromDb.length ? fromDb : fromMarkdown(selected.content || ""));
  }, [selected]);

  const triggerAutoIndex = async (payload: Record<string, any>) => {
    try {
      await invokeAdminFunction("index-content", {
        body: {
          table: "blogs",
          ...payload,
        },
      });
    } catch (e) {
      console.error("auto-index error", e);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: TypographyBlock =
      type === "points"
        ? { type, items: [""] }
        : type === "image"
          ? { type, url: "", alt: "" }
          : { type, text: "", style: defaultStyle(type) };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (idx: number, updates: Partial<TypographyBlock>) =>
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...updates } : b)));

  const removeBlock = (idx: number) => setBlocks((prev) => prev.filter((_, i) => i !== idx));

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setBlocks(copy);
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const markdown = buildMarkdown(blocks);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      image_url: imageUrl.trim(),
      is_published: isPublished,
      content_blocks: blocks,
      content: markdown,
    };

    const { data: savedRow, error } = await (supabase as any).from("blogs").update(payload).eq("id", selectedId).select().single();
    if (error) toast.error(error.message || "Failed to save blog");
    else {
      toast.success("Blog typography/content saved");
      await triggerAutoIndex(savedRow || { id: selectedId, slug: slug.trim(), is_published: isPublished });
      await loadBlogs();
    }
    setSaving(false);
  };

  const generateThumbnail = async () => {
    const prompt = buildMasterImagePrompt({
      subject: `Blog thumbnail for "${title || "blog post"}"`,
      details: [excerpt],
    });
    setGeneratingThumb(true);
    try {
      const url = await generateImageFromPrompt(prompt, { width: 1200, height: 630, uploadToCloudinary: true });
      setImageUrl(url);
      toast.success("Thumbnail generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate thumbnail");
    }
    setGeneratingThumb(false);
  };

  const generateBlockImage = async (idx: number) => {
    const block = blocks[idx];
    if (!block || block.type !== "image") return;
    const contextText =
      block.alt ||
      blocks[Math.max(0, idx - 1)]?.text ||
      blocks[Math.max(0, idx - 2)]?.text ||
      excerpt ||
      title;
    const prompt = buildMasterImagePrompt({
      subject: `Blog section image for "${title || "article"}"`,
      details: [contextText],
    });
    setGeneratingBlockIdx(idx);
    try {
      const url = await generateImageFromPrompt(prompt, { width: 1200, height: 675, uploadToCloudinary: true });
      updateBlock(idx, { url });
      toast.success("Inline image generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate image");
    }
    setGeneratingBlockIdx(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Blog Typography Editor</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          {blogs.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedId === b.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
              }`}
            >
              <p className="truncate">{b.title}</p>
              <p className="text-[10px] opacity-70 truncate">/{b.slug}</p>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-4">
          {!selected ? (
            <div className="text-muted-foreground py-10 text-center">Select a blog to edit typography/content</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Slug</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Excerpt</label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Thumbnail URL</label>
                  <div className="flex gap-2">
                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    <Button type="button" variant="outline" size="sm" onClick={generateThumbnail} disabled={generatingThumb}>
                      <Sparkles className={`h-4 w-4 mr-1 ${generatingThumb ? "animate-spin" : ""}`} />
                      {generatingThumb ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>
                <label className="text-xs text-muted-foreground flex items-center gap-2 mt-5">
                  <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                  Published
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-sm text-foreground">Blocks</h3>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => addBlock("heading")}>+ Heading</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock("subheading")}>+ Subheading</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock("paragraph")}>+ Paragraph</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock("points")}>+ Points</Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock("image")}>+ Image</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {blocks.map((block, idx) => (
                    <div key={idx} className="bg-muted/40 border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{block.type}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveBlock(idx, -1)}><ChevronUp className="h-4 w-4" /></button>
                          <button onClick={() => moveBlock(idx, 1)}><ChevronDown className="h-4 w-4" /></button>
                          <button className="text-destructive" onClick={() => removeBlock(idx)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>

                      {(block.type === "heading" || block.type === "subheading") && (
                        <Input value={block.text || ""} onChange={(e) => updateBlock(idx, { text: e.target.value })} placeholder="Heading text" />
                      )}

                      {block.type === "paragraph" && (
                        <Textarea value={block.text || ""} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={4} />
                      )}

                      {block.type === "points" && (
                        <div className="space-y-1">
                          {(block.items || []).map((item, itemIdx) => (
                            <div className="flex gap-1" key={itemIdx}>
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const items = [...(block.items || [])];
                                  items[itemIdx] = e.target.value;
                                  updateBlock(idx, { items });
                                }}
                              />
                              <button
                                className="text-destructive"
                                onClick={() => updateBlock(idx, { items: (block.items || []).filter((_, i) => i !== itemIdx) })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={() => updateBlock(idx, { items: [...(block.items || []), ""] })}>
                            + Add point
                          </Button>
                        </div>
                      )}

                      {block.type === "image" && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input value={block.url || ""} onChange={(e) => updateBlock(idx, { url: e.target.value })} placeholder="Image URL" />
                            <Button type="button" variant="outline" size="sm" onClick={() => generateBlockImage(idx)} disabled={generatingBlockIdx === idx}>
                              <Sparkles className={`h-4 w-4 mr-1 ${generatingBlockIdx === idx ? "animate-spin" : ""}`} />
                              {generatingBlockIdx === idx ? "Generating..." : "Generate"}
                            </Button>
                          </div>
                          <Input value={block.alt || ""} onChange={(e) => updateBlock(idx, { alt: e.target.value })} placeholder="Alt text" />
                          {block.url ? <img src={block.url} alt={block.alt || ""} className="h-28 w-full rounded border object-cover" /> : null}
                        </div>
                      )}

                      {(block.type === "heading" || block.type === "subheading" || block.type === "paragraph") && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <select
                            value={block.style?.size || defaultStyle(block.type).size}
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
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Blog Content"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogTypographyAdmin;
