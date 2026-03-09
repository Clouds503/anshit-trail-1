import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";

const SettingsAdmin = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [snippets, setSnippets] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingServiceAccount, setUploadingServiceAccount] = useState(false);
  const fallbackSitemapUrl = import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`
    : "";

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("*");
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((d: any) => {
          try {
            map[d.key] = typeof d.value === "string" ? JSON.parse(d.value) : d.value;
          } catch {
            map[d.key] = d.value;
          }
        });
        setSettings(map);
        setSnippets(Array.isArray(map.custom_snippets) ? map.custom_snippets.join("\n\n") : "");
      }
    })();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    setSaving(true);
    await (supabase as any).from("site_settings").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
    toast.success(`${key} updated`);
    setSaving(false);
  };

  const s = (key: string) => settings[key] || "";
  const isEnabled = (key: string, fallback = false) => {
    const value = settings[key];
    if (value === undefined || value === null) return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
  };
  const asPositiveInt = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(12, Math.min(180, Math.round(parsed)));
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-heading font-bold text-foreground sm:text-2xl">Site Settings</h1>
      <div className="max-w-3xl space-y-6">
        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Branding</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Site Title</label>
              <Input
                value={s("site_title")}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                placeholder="Clouds Trail"
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Site Subtitle</label>
              <Input
                value={s("site_subtitle")}
                onChange={(e) => setSettings({ ...settings, site_subtitle: e.target.value })}
                placeholder="#1 IT Training Institute"
                maxLength={120}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Site Description</label>
              <Textarea
                value={s("site_description")}
                onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                placeholder="Short brand description used in footer and defaults."
                rows={3}
                maxLength={260}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Header Logo Height (px)</label>
                <Input
                  type="number"
                  min={12}
                  max={180}
                  value={s("header_logo_height") || 40}
                  onChange={(e) => setSettings({ ...settings, header_logo_height: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Footer Logo Height (px)</label>
                <Input
                  type="number"
                  min={12}
                  max={180}
                  value={s("footer_logo_height") || 40}
                  onChange={(e) => setSettings({ ...settings, footer_logo_height: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={async () => {
                await saveSetting("site_title", `${settings.site_title || "Clouds Trail"}`.trim() || "Clouds Trail");
                await saveSetting("site_subtitle", `${settings.site_subtitle || "#1 IT Training Institute"}`.trim() || "#1 IT Training Institute");
                await saveSetting("site_description", `${settings.site_description || ""}`.trim());
                await saveSetting("header_logo_height", asPositiveInt(settings.header_logo_height, 40));
                await saveSetting("footer_logo_height", asPositiveInt(settings.footer_logo_height, 40));
              }}
              disabled={saving}
            >
              Save Branding
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="space-y-4">
            <div>
              <h2 className="font-heading font-bold text-sm text-foreground mb-3">Hero Section Mode</h2>
              <Select value={s("hero_mode") || "3d"} onValueChange={(v) => { setSettings({ ...settings, hero_mode: v }); saveSetting("hero_mode", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3d">3D Floating</SelectItem>
                  <SelectItem value="slideshow">Slides</SelectItem>
                  <SelectItem value="static">Static Banner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground">Homepage Preloader</h3>
                  <p className="text-xs text-muted-foreground">Show preloader before home page content appears.</p>
                </div>
                <Switch
                  checked={isEnabled("preloader_enabled", true)}
                  onCheckedChange={(v) => {
                    setSettings({ ...settings, preloader_enabled: v });
                    saveSetting("preloader_enabled", v);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">WhatsApp Widget</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Visible</label>
              <Switch checked={isEnabled("whatsapp_visible", true)} onCheckedChange={(v) => { setSettings({ ...settings, whatsapp_visible: v }); saveSetting("whatsapp_visible", v); }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">WhatsApp Link</label>
              <Input value={s("whatsapp_link")} onChange={(e) => setSettings({ ...settings, whatsapp_link: e.target.value })} placeholder="https://wa.me/91..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Position</label>
              <Select value={s("whatsapp_position") || "bottom-right"} onValueChange={(v) => { setSettings({ ...settings, whatsapp_position: v }); saveSetting("whatsapp_position", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => saveSetting("whatsapp_link", settings.whatsapp_link)} disabled={saving}>Save WhatsApp Settings</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Custom Snippets</h2>
          <Textarea value={snippets} onChange={(e) => setSnippets(e.target.value)} rows={6} placeholder="Paste custom HTML/script snippets..." />
          <Button className="mt-2" onClick={() => saveSetting("custom_snippets", snippets.split("\n\n").filter(Boolean))} disabled={saving}>Save Snippets</Button>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Admin Email</h2>
          <Input value={s("admin_email")} onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })} placeholder="admin@example.com" />
          <Button className="mt-2" onClick={() => saveSetting("admin_email", settings.admin_email)} disabled={saving}>Save</Button>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Cloudinary</h2>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Cloud Name</label><Input value={s("cloudinary_cloud_name")} onChange={(e) => setSettings({ ...settings, cloudinary_cloud_name: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Upload Preset</label><Input value={s("cloudinary_upload_preset")} onChange={(e) => setSettings({ ...settings, cloudinary_upload_preset: e.target.value })} /></div>
            <Button onClick={async () => { await saveSetting("cloudinary_cloud_name", settings.cloudinary_cloud_name); await saveSetting("cloudinary_upload_preset", settings.cloudinary_upload_preset); }} disabled={saving}>Save Cloudinary</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Search Indexing</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Site URL</label>
              <Input value={s("site_url")} onChange={(e) => setSettings({ ...settings, site_url: e.target.value })} placeholder="https://yourdomain.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Permanent Sitemap URL</label>
              <Input
                value={s("sitemap_url") || fallbackSitemapUrl}
                onChange={(e) => setSettings({ ...settings, sitemap_url: e.target.value })}
                placeholder={fallbackSitemapUrl || "https://yourdomain.com/sitemap.xml"}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Custom Indexing Webhook (optional)</label>
              <Input value={s("indexing_api_url")} onChange={(e) => setSettings({ ...settings, indexing_api_url: e.target.value })} placeholder="https://example.com/index" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Ping Bing sitemap on updates</label>
              <Switch checked={isEnabled("bing_sitemap_ping_enabled", true)} onCheckedChange={(v) => setSettings({ ...settings, bing_sitemap_ping_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Enable IndexNow</label>
              <Switch checked={isEnabled("indexnow_enabled", false)} onCheckedChange={(v) => setSettings({ ...settings, indexnow_enabled: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IndexNow Key</label>
              <Input value={s("indexnow_key")} onChange={(e) => setSettings({ ...settings, indexnow_key: e.target.value })} placeholder="your-indexnow-key" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IndexNow Host</label>
              <Input value={s("indexnow_host")} onChange={(e) => setSettings({ ...settings, indexnow_host: e.target.value })} placeholder="yourdomain.com" />
            </div>
            <Button
              onClick={async () => {
                await saveSetting("site_url", settings.site_url || "");
                await saveSetting("sitemap_url", settings.sitemap_url || fallbackSitemapUrl || "");
                await saveSetting("indexing_api_url", settings.indexing_api_url || "");
                await saveSetting("bing_sitemap_ping_enabled", isEnabled("bing_sitemap_ping_enabled", true));
                await saveSetting("indexnow_enabled", isEnabled("indexnow_enabled", false));
                await saveSetting("indexnow_key", settings.indexnow_key || "");
                await saveSetting("indexnow_host", settings.indexnow_host || "");
              }}
              disabled={saving}
            >
              Save Indexing Settings
            </Button>
            <p className="text-xs text-muted-foreground">
              If IndexNow is enabled, keep your key file accessible at
              {" "}
              <span className="font-mono">https://yourdomain.com/&lt;indexnow-key&gt;.txt</span>.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Analytics Service Account</h2>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">JSON / Endpoint</label>
            <Textarea
              value={s("analytics_service_account")}
              onChange={(e) => setSettings({ ...settings, analytics_service_account: e.target.value })}
              rows={6}
              placeholder="Paste service account JSON or upload file"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => saveSetting("analytics_service_account", settings.analytics_service_account)} disabled={saving}>Save</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".json,application/json";
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingServiceAccount(true);
                    try {
                      const text = await file.text();
                      JSON.parse(text);
                      setSettings({ ...settings, analytics_service_account: text });
                      await saveSetting("analytics_service_account", text);
                      toast.success("Service account JSON uploaded and saved");
                    } catch (err: any) {
                      toast.error(err.message || "Invalid JSON file");
                    }
                    setUploadingServiceAccount(false);
                  };
                  input.click();
                }}
                disabled={saving || uploadingServiceAccount}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadingServiceAccount ? "Uploading..." : "Upload JSON"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Upload JSON file or paste manually. Used by backend analytics integrations.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-bold text-sm text-foreground mb-3">Razorpay</h2>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Key ID (publishable)</label><Input value={s("razorpay_key_id")} onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value })} placeholder="rzp_test_..." /></div>
            <Button onClick={() => saveSetting("razorpay_key_id", settings.razorpay_key_id)} disabled={saving}>Save</Button>
            <p className="text-xs text-muted-foreground">Secret key is stored in backend secrets.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsAdmin;
