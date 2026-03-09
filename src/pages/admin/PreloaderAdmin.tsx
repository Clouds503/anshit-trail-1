import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "boolean") return parsed;
      if (typeof parsed === "number") return parsed !== 0;
      if (typeof parsed === "string") {
        const normalized = parsed.toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) return true;
        if (["false", "0", "no", "off"].includes(normalized)) return false;
      }
    } catch {
      const normalized = trimmed.toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
  }
  return fallback;
}

const PreloaderAdmin = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "preloader_enabled")
        .maybeSingle();

      if (error) {
        toast.error("Failed to load preloader setting");
        setLoading(false);
        return;
      }

      setEnabled(parseBooleanSetting(data?.value, true));
      setLoading(false);
    })();
  }, []);

  const save = async (value: boolean) => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key: "preloader_enabled", value: JSON.stringify(value) }, { onConflict: "key" });
    setSaving(false);

    if (error) {
      toast.error("Failed to update preloader setting");
      return;
    }

    setEnabled(value);
    toast.success(`Preloader ${value ? "enabled" : "disabled"}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Preloader</h1>

      <div className="max-w-lg bg-card border rounded-lg p-5">
        <p className="text-sm text-muted-foreground mb-4">
          Control whether the homepage preloader is shown to public visitors.
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Show Preloader on Home Page</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current status: {loading ? "Loading..." : enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={loading || saving}
            onCheckedChange={(value) => save(value)}
          />
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            disabled={loading || saving}
            onClick={() => save(enabled)}
          >
            {saving ? "Saving..." : "Save Again"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreloaderAdmin;

