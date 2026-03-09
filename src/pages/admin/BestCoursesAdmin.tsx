import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface BestCourse {
  id: string;
  program_id: string;
  display_order: number;
  is_active: boolean;
  program: {
    id: string;
    title: string;
  };
}

interface Program {
  id: string;
  title: string;
}

const BestCoursesAdmin = () => {
  const [data, setData] = useState<BestCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("programs")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      return (data as Program[]) || [];
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("best_courses")
      .select("id, program_id, display_order, is_active, program:program_id(id, title)")
      .eq("is_active", true)
      .order("display_order");
    setData((rows || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get available programs (not already in best courses)
  const availablePrograms = programs.filter(
    (p) => !data.some((bc) => bc.program_id === p.id)
  );

  const handleAddCourse = async () => {
    if (!selectedProgramId) {
      toast.error("Select a program");
      return;
    }

    setSaving(true);
    const maxOrder = data.length > 0 ? Math.max(...data.map((d) => d.display_order)) : -1;
    
    const { error } = await supabase.from("best_courses").insert({
      program_id: selectedProgramId,
      display_order: maxOrder + 1,
      is_active: true,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to add course");
      return;
    }

    toast.success("Course added successfully");
    setSelectedProgramId("");
    setDialogOpen(false);
    fetchData();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("best_courses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to remove course");
      return;
    }

    toast.success("Course removed");
    fetchData();
  };

  const handleReorder = async () => {
    setSaving(true);
    const updates = data.map((item, idx) => ({
      id: item.id,
      display_order: idx,
    }));

    for (const update of updates) {
      await supabase
        .from("best_courses")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    setSaving(false);
    toast.success("Order updated");
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropId: string) => {
    if (!draggedId || draggedId === dropId) return;

    const draggedIdx = data.findIndex((d) => d.id === draggedId);
    const dropIdx = data.findIndex((d) => d.id === dropId);

    const newData = [...data];
    [newData[draggedIdx], newData[dropIdx]] = [newData[dropIdx], newData[draggedIdx]];
    setData(newData);
    setDraggedId(null);
  };

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground sm:text-2xl">Best Courses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage programs featured in the 3D slider on the home page
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No courses selected yet</p>
          <Button onClick={() => setDialogOpen(true)}>Add First Course</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(item.id)}
              className={`cursor-move rounded-lg border bg-card p-4 transition-all hover:border-primary/30 ${
                draggedId === item.id ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.program.title}</p>
                  <p className="text-xs text-muted-foreground">Order: {item.display_order}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(item.id)}
                  className="w-full text-destructive hover:bg-destructive/10 sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            onClick={handleReorder}
            disabled={saving}
            variant="secondary"
            className="w-full mt-4 gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      )}

      {/* Add Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add Course to Best Courses</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Select Program</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-2"
              >
                <option value="">Choose a program...</option>
                {availablePrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setSelectedProgramId("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCourse} disabled={saving}>
                {saving ? "Adding..." : "Add Course"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BestCoursesAdmin;
