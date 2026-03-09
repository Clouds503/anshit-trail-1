import CrudTable, { CrudField } from "@/components/admin/CrudTable";

const fields: CrudField[] = [
  { key: "title", label: "Title", type: "text", required: true, showInTable: true },
  { key: "slug", label: "Slug", type: "text", required: true, showInTable: true },
  { key: "excerpt", label: "Excerpt", type: "textarea", showInTable: false },
  { key: "content", label: "Content", type: "textarea", showInTable: false },
  { key: "image_url", label: "Image URL", type: "url", showInTable: false },
  { key: "category", label: "Category", type: "text", showInTable: true },
  { key: "author", label: "Author", type: "text", defaultValue: "Clouds Trail", showInTable: true },
  { key: "is_published", label: "Published", type: "boolean", defaultValue: false, showInTable: true },
  { key: "seo_title", label: "SEO Title", type: "text", showInTable: false },
  { key: "seo_description", label: "SEO Description", type: "textarea", showInTable: false },
  { key: "seo_keywords", label: "SEO Keywords (comma-separated)", type: "array", showInTable: false },
];

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildMasterImagePrompt, generateImageFromPrompt, isImageUrlHealthy } from "@/lib/admin-image";
import { toast } from "sonner";

const BlogsAdmin = () => {
  const [fixing, setFixing] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);
  const [totalBroken, setTotalBroken] = useState(0);

  const fixBrokenImages = async () => {
    if (fixing) return;
    setFixing(true);
    setFixedCount(0);
    try {
      const { data: blogs } = await (supabase as any).from("blogs").select("id, title, excerpt, image_url");
      const list = blogs || [];
      const broken: any[] = [];
      for (const b of list) {
        let bad = false;
        if (!b.image_url) bad = true;
        else if (!(await isImageUrlHealthy(b.image_url))) bad = true;
        if (bad) broken.push(b);
      }
      setTotalBroken(broken.length);
      for (const b of broken) {
        try {
          const prompt = buildMasterImagePrompt({
            subject: `Blog hero image for ${b.title}`,
            details: [b.excerpt],
          });
          const url = await generateImageFromPrompt(prompt, { width: 1200, height: 630, uploadToCloudinary: true });
          const { error } = await (supabase as any).from("blogs").update({ image_url: url }).eq("id", b.id);
          if (!error) setFixedCount((c) => c + 1);
        } catch (e: any) {
          console.error("failed to fix blog image", b.id, e);
        }
      }
      toast.success(`Fixed ${fixedCount || broken.length} blog images`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fix images");
    }
    setFixing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading font-bold text-foreground">Blogs</h1>
        <Button variant="outline" onClick={fixBrokenImages} disabled={fixing}>
          {fixing ? `Fixing (${fixedCount}/${totalBroken})` : "Fix Broken Images"}
        </Button>
      </div>
      <CrudTable title="Blogs" tableName="blogs" fields={fields} orderBy="created_at" ascending={false} />
    </div>
  );
};

export default BlogsAdmin;
