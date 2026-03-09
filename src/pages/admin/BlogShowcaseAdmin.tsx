import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type PreviewBlog = {
  id: string;
  slug: string;
  title: string;
  created_at: string | null;
};

const parseLimitValue = (value: unknown) => {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = parsed.trim();
    }
  }
  return Number(parsed) === 5 ? 5 : 6;
};

const BlogShowcaseAdmin = () => {
  const [limit, setLimit] = useState<5 | 6>(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blogs, setBlogs] = useState<PreviewBlog[]>([]);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: settingData }, { data: blogData }] = await Promise.all([
      (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "blog_newly_arrived_limit")
        .maybeSingle(),
      (supabase as any)
        .from("blogs")
        .select("id, slug, title, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setLimit(parseLimitValue(settingData?.value));
    setBlogs(blogData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const newlyArrivedBlogs = useMemo(() => blogs.slice(0, limit), [blogs, limit]);
  const moreBlogs = useMemo(() => blogs.slice(limit), [blogs, limit]);

  const saveLimit = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert(
        {
          key: "blog_newly_arrived_limit",
          value: JSON.stringify(limit),
        },
        { onConflict: "key" },
      );

    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save blog showcase settings");
      return;
    }

    toast.success("Blog showcase settings saved");
    fetchData();
  };

  return (
    <div>
      <h1 className="mb-2 text-xl font-heading font-bold text-foreground sm:text-2xl">Blog Showcase</h1>
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Control how many latest blogs are auto-assigned to the public page&apos;s
        {" "}
        <span className="font-semibold text-foreground">Newly Arrived</span>
        {" "}
        slider. Every new published blog enters this section automatically, and older ones move to
        {" "}
        <span className="font-semibold text-foreground">More Blogs</span>
        {" "}
        once the limit is reached.
      </p>

      <div className="mb-6 rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-heading font-bold text-foreground">Newly Arrived Limit</h2>
        <div className="flex flex-col gap-3 sm:max-w-xs">
          <Select value={String(limit)} onValueChange={(value) => setLimit(value === "5" ? 5 : 6)}>
            <SelectTrigger>
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 blogs</SelectItem>
              <SelectItem value="5">5 blogs</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={saveLimit} disabled={saving}>
            {saving ? "Saving..." : "Save Blog Showcase Limit"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-heading font-bold text-foreground">Newly Arrived Preview ({newlyArrivedBlogs.length})</h3>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">These blogs appear in the 3D auto slider.</p>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : newlyArrivedBlogs.length > 0 ? (
              newlyArrivedBlogs.map((blog, index) => (
                <div key={blog.id} className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">#{index + 1}</p>
                  <p className="text-sm font-medium text-foreground">{blog.title}</p>
                  <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No published blogs found.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-heading font-bold text-foreground">More Blogs Preview ({moreBlogs.length})</h3>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">Older blogs automatically roll into this section.</p>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : moreBlogs.length > 0 ? (
              moreBlogs.map((blog) => (
                <div key={blog.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium text-foreground">{blog.title}</p>
                  <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No extra blogs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogShowcaseAdmin;
