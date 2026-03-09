import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const EnrollmentsAdmin = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows } = await (supabase as any).from("enrollments").select("*").order("created_at", { ascending: false });
      setData(rows || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">💳 Enrollments & Payments</h1>
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No enrollments yet.</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.bill_number || "—"}</TableCell>
                  <TableCell>
                    <div><span className="font-medium text-sm">{e.name}</span></div>
                    <div className="text-xs text-muted-foreground">{e.email} · {e.phone}</div>
                  </TableCell>
                  <TableCell className="text-sm">{e.program}</TableCell>
                  <TableCell className="font-semibold">₹{Number(e.amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{e.preferred_batch_time}{e.next_batch_date ? <><br /><span className="text-muted-foreground">{new Date(e.next_batch_date).toLocaleDateString('en-IN')}</span></> : null}</TableCell>
                  <TableCell>
                    <Badge variant={e.payment_status === "paid" ? "default" : "secondary"} className={e.payment_status === "paid" ? "bg-green-500" : ""}>
                      {e.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default EnrollmentsAdmin;
