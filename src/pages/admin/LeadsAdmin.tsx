import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  program: string;
  lead_type: string;
  source_page: string | null;
  created_at: string;
}

const LeadsAdmin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterProgram, setFilterProgram] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch leads");
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const uniqueTypes = [...new Set(leads.map((l) => l.lead_type))];
  const uniqueSources = [...new Set(leads.map((l) => l.source_page || "unknown"))];
  const uniquePrograms = [...new Set(leads.map((l) => l.program))];

  const filtered = leads.filter((l) => {
    const matchSearch = !search || [l.name, l.email, l.phone].some((v) => v.toLowerCase().includes(search.toLowerCase()));
    const matchType = !filterType || l.lead_type === filterType;
    const matchSource = !filterSource || (l.source_page || "unknown") === filterSource;
    const matchProgram = !filterProgram || l.program === filterProgram;
    return matchSearch && matchType && matchSource && matchProgram;
  });

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Program", "Lead Type", "Source Page", "Date"];
    const rows = filtered.map((l) => [
      l.name, l.email, l.phone, l.program, l.lead_type, l.source_page || "", new Date(l.created_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} leads`);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterSource("");
    setFilterProgram("");
  };

  const hasFilters = search || filterType || filterSource || filterProgram;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground sm:text-2xl">Leads / Enquiries</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {leads.length} leads</p>
        </div>
        <Button onClick={exportCSV} variant="outline" disabled={filtered.length === 0} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:min-w-[220px] sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto sm:min-w-[150px]">
            <option value="">All Types</option>
            {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto sm:min-w-[150px]">
            <option value="">All Sources</option>
            {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto sm:min-w-[170px]">
            <option value="">All Programs</option>
            {uniquePrograms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-muted-foreground sm:w-auto">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No leads found.</div>
      ) : (
        <div className="overflow-auto rounded-lg border bg-card">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.phone}</TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-accent text-xs font-medium text-foreground">{l.program}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.lead_type === "enrollment" ? "bg-primary/10 text-primary" :
                      l.lead_type === "syllabus_download" ? "bg-accent text-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>{l.lead_type}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{l.source_page || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default LeadsAdmin;
