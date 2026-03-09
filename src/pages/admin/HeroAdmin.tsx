import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CrudTable, { CrudField } from "@/components/admin/CrudTable";
import { Layers, SlidersHorizontal, Image } from "lucide-react";

const modes = [
  { key: "3d", label: "3D Mode", icon: Layers },
  { key: "slideshow", label: "Slideshow", icon: SlidersHorizontal },
  { key: "static", label: "Static", icon: Image },
];

const slideFields: CrudField[] = [
  { key: "title", label: "Title", type: "text", required: true, showInTable: true },
  { key: "subtitle", label: "Subtitle", type: "text", showInTable: true },
  { key: "image_url", label: "Image URL", type: "url", showInTable: true },
  { key: "sort_order", label: "Sort Order", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, showInTable: true },
];

const HeroAdmin = () => {
  const [heroMode, setHeroMode] = useState("3d");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "hero_mode").maybeSingle();
      if (data) setHeroMode(JSON.parse(data.value) || "3d");
    })();
  }, []);

  const saveMode = async (mode: string) => {
    setSaving(true);
    setHeroMode(mode);
    await (supabase as any).from("site_settings").update({ value: JSON.stringify(mode) }).eq("key", "hero_mode");
    toast.success("Hero mode updated");
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Hero Section</h1>

      <div className="bg-card border rounded-lg p-5 mb-8">
        <h2 className="font-heading font-bold text-sm text-foreground mb-3">Display Mode</h2>
        <div className="flex gap-2">
          {modes.map((m) => (
            <Button key={m.key} variant={heroMode === m.key ? "default" : "outline"} onClick={() => saveMode(m.key)} disabled={saving}>
              <m.icon className="h-4 w-4 mr-2" />{m.label}
            </Button>
          ))}
        </div>
      </div>

      <CrudTable title="Hero Slides" tableName="hero_slides" fields={slideFields} orderBy="sort_order" />
    </div>
  );
};

export default HeroAdmin;
