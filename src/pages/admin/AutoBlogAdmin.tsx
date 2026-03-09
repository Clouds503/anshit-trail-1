import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bot, Sparkles, Calendar, Trash2, Clock, Plus, RefreshCw, Search, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invokeAdminFunction } from "@/lib/edge-functions";

const AutoBlogAdmin = () => {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  
  // Research
  const [researching, setResearching] = useState(false);
  const [researchTopics, setResearchTopics] = useState<any[]>([]);

  // Queue
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [addQueueOpen, setAddQueueOpen] = useState(false);
  const [queueTopic, setQueueTopic] = useState("");
  const [queueKeywords, setQueueKeywords] = useState("");
  const [queueDate, setQueueDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [queueingRefresh, setQueueingRefresh] = useState(false);

  // Schedule settings
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [savingTime, setSavingTime] = useState(false);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    const { data } = await (supabase as any).from("blog_queue").select("*").order("scheduled_date");
    setQueue(data || []);
    setQueueLoading(false);
  }, []);

  const fetchScheduleTime = useCallback(async () => {
    const { data } = await (supabase as any).from("site_settings").select("*").eq("key", "blog_schedule_time").maybeSingle();
    if (data?.value) {
      try {
        const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setScheduleTime(typeof val === "string" ? val : "10:00");
      } catch { setScheduleTime("10:00"); }
    }
  }, []);

  useEffect(() => { fetchQueue(); fetchScheduleTime(); }, [fetchQueue, fetchScheduleTime]);

  const generate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true);
    setPreview(null);
    try {
      const data = await invokeAdminFunction<any>("auto-blog", {
        body: { topic: topic.trim(), keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) },
      });
      setPreview(data);
      toast.success(data?.message || "Blog generated and published.");
    } catch (e: any) {
      const msg = String(e?.message || "Failed to generate blog");
      const status = Number(e?.status || 0);
      const duplicateBlocked = status === 409 || /topic is too close|already exists|duplicate/i.test(msg.toLowerCase());
      if (duplicateBlocked) {
        toast(msg);
      } else {
        toast.error(msg);
      }
    }
    setGenerating(false);
  };

  const researchBlogTopics = async () => {
    setResearching(true);
    setResearchTopics([]);
    try {
      const data = await invokeAdminFunction<any>("research-blog-topics", {
        body: { count: 10 },
      });
      setResearchTopics(data?.topics || []);
      toast.success(`Found ${data?.topics?.length || 0} topic ideas!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to research topics");
    }
    setResearching(false);
  };

  const addResearchTopicToQueue = async (t: any) => {
    const { error } = await (supabase as any).from("blog_queue").insert({
      topic: t.topic,
      keywords: t.keywords || [],
      status: "pending",
    });
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Added to queue!");
    fetchQueue();
  };

  const addToQueue = async () => {
    if (!queueTopic.trim()) { toast.error("Enter a topic"); return; }
    const { error } = await (supabase as any).from("blog_queue").insert({
      topic: queueTopic.trim(),
      keywords: queueKeywords.split(",").map((k: string) => k.trim()).filter(Boolean),
      scheduled_date: queueDate || null,
      status: "pending",
    });
    if (error) { toast.error("Failed to add to queue"); return; }
    toast.success("Added to queue");
    setQueueTopic(""); setQueueKeywords(""); setQueueDate("");
    setAddQueueOpen(false);
    fetchQueue();
  };

  const deleteQueueItem = async (id: string) => {
    await (supabase as any).from("blog_queue").delete().eq("id", id);
    toast.success("Removed from queue");
    fetchQueue();
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const data = await invokeAdminFunction<any>("process-blog-queue");
      toast.success(data?.message || "Queue processed!");
      fetchQueue();
    } catch (e: any) {
      toast.error(e.message || "Failed to process queue");
    }
    setProcessing(false);
  };

  const saveScheduleTime = async () => {
    setSavingTime(true);
    await (supabase as any).from("site_settings").upsert({ key: "blog_schedule_time", value: JSON.stringify(scheduleTime) }, { onConflict: "key" });
    toast.success("Schedule saved and cron synced");
    setSavingTime(false);
  };

  const queueWeakBlogsForRefresh = async () => {
    setQueueingRefresh(true);
    try {
      const data = await invokeAdminFunction<any>("refresh-weak-blogs", {
        body: { max_items: 5 },
      });
      toast.success(`Queued ${data?.queued_count || 0} weak blogs for refresh`);
      fetchQueue();
    } catch (e: any) {
      toast.error(e.message || "Failed to queue refresh topics");
    }
    setQueueingRefresh(false);
  };

  const publishQueueItem = async (item: any) => {
    setPublishingId(item.id);
    try {
      const data = await invokeAdminFunction<any>("publish-queued-blog", {
        body: { queue_id: item.id },
      });
      toast.success(data?.message || "Blog published");
      fetchQueue();
    } catch (e: any) {
      toast.error(e.message || "Failed to publish");
    }
    setPublishingId(null);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    generating: "bg-blue-100 text-blue-800",
    generated: "bg-emerald-100 text-emerald-800",
    review: "bg-indigo-100 text-indigo-800",
    ready: "bg-indigo-100 text-indigo-800",
    published: "bg-primary/10 text-primary",
    failed: "bg-destructive/10 text-destructive",
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Auto Blog Generator</h1>
      
      {/* Instant Generate */}
      <div className="bg-card border rounded-lg p-6 max-w-2xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Powered by Groq AI + Pollinations + Cloudinary for images</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Topic / Title</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The Future of Cloud Computing in 2026" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Target Keywords (comma-separated, optional)</label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. cloud computing, AWS, Azure" />
          </div>
          <Button onClick={generate} disabled={generating} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />{generating ? "Generating (this may take a moment)..." : "Generate & Publish Now"}
          </Button>
        </div>

        {preview && (
          <div className="mt-6 border-t pt-4">
            <h2 className="font-heading font-bold text-lg text-foreground mb-2">{preview.title}</h2>
            {preview.image_url && <img src={preview.image_url} alt={preview.title} className="w-full h-48 object-cover rounded-lg mb-3" />}
            <p className="text-sm text-muted-foreground mb-3">{preview.excerpt}</p>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded max-h-60 overflow-y-auto whitespace-pre-wrap">{preview.content?.slice(0, 1000)}...</div>
            <p className="text-xs text-primary mt-3">Published automatically.</p>
          </div>
        )}
      </div>

      {/* SEO Topic Research */}
      <div className="bg-card border rounded-lg p-6 max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">SEO Topic Research</h2>
          </div>
          <Button onClick={researchBlogTopics} disabled={researching} variant="outline" size="sm">
            <Search className={`h-4 w-4 mr-2 ${researching ? "animate-spin" : ""}`} />
            {researching ? "Researching..." : "Find Trending Topics"}
          </Button>
        </div>
        {researchTopics.length > 0 && (
          <div className="space-y-2">
            {researchTopics.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.topic}</p>
                  <p className="text-xs text-muted-foreground">{t.keywords?.join(", ")}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === "high" ? "bg-primary/10 text-primary" : t.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground"}`}>
                    {t.priority}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => addResearchTopicToQueue(t)} title="Add to queue">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setTopic(t.topic); setKeywords(t.keywords?.join(", ") || ""); }} title="Use for instant generate">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="bg-card border rounded-lg p-6 max-w-2xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold text-foreground">Auto-Post Schedule</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Daily post time (IST):</label>
          <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-36" />
          <Button onClick={saveScheduleTime} disabled={savingTime} size="sm" variant="outline">Save</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Queued topics scheduled for today or earlier are generated and published automatically at this time (IST).</p>
      </div>

      {/* Blog Queue */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Blog Queue</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={queueWeakBlogsForRefresh} disabled={queueingRefresh} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${queueingRefresh ? "animate-spin" : ""}`} />
              {queueingRefresh ? "Queueing..." : "Queue Weak Blogs"}
            </Button>
            <Button onClick={processQueue} disabled={processing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${processing ? "animate-spin" : ""}`} />
              {processing ? "Processing..." : "Process Now"}
            </Button>
            <Button onClick={() => setAddQueueOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />Add Topic
            </Button>
          </div>
        </div>

        {queueLoading ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Loading...</p>
        ) : queue.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No items in queue. Add topics for daily auto-posting.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.topic}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.keywords?.join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">{item.scheduled_date || "ASAP"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status] || ""}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(item.status === "review" || item.status === "generated") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => publishQueueItem(item)}
                          disabled={publishingId === item.id}
                          title="Publish this reviewed draft"
                        >
                          <CheckCircle2 className={`h-4 w-4 ${publishingId === item.id ? "animate-pulse" : ""}`} />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => deleteQueueItem(item.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add to Queue Dialog */}
      <Dialog open={addQueueOpen} onOpenChange={setAddQueueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add to Blog Queue</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Topic *</label>
              <Input value={queueTopic} onChange={(e) => setQueueTopic(e.target.value)} placeholder="Blog topic" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Keywords (comma-separated)</label>
              <Input value={queueKeywords} onChange={(e) => setQueueKeywords(e.target.value)} placeholder="keyword1, keyword2" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Scheduled Date</label>
              <Input type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} />
            </div>
            <Button onClick={addToQueue} className="w-full">Add to Queue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoBlogAdmin;
