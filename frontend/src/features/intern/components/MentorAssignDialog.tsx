import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { internService } from "../services/internService";
import type { Intern, Mentor } from "../intern.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internId: string;
  internName: string;
  currentMentorId?: string | null;
  onAssigned?: (updated: Intern) => void;
};

export default function MentorAssignDialog({
  open,
  onOpenChange,
  internId,
  internName,
  currentMentorId,
  onAssigned,
}: Props) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selected, setSelected] = useState(currentMentorId ?? "");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const isChange = Boolean(currentMentorId);

  useEffect(() => {
    if (!open) return;
    setSelected(currentMentorId ?? "");
    setFetching(true);
    internService
      .listMentors()
      .then(setMentors)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load doctors."))
      .finally(() => setFetching(false));
  }, [open, currentMentorId]);

  const handleSave = async () => {
    if (!selected) {
      toast.error("Please select a mentor.");
      return;
    }
    setLoading(true);
    try {
      const updated = await internService.assignMentor(internId, selected);
      toast.success(isChange ? "Mentor updated successfully." : "Mentor assigned successfully.");
      onAssigned?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign mentor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isChange ? "Change Mentor" : "Assign Mentor"}</DialogTitle>
          <DialogDescription>
            Select a clinical mentor for <span className="font-medium">{internName}</span>.
            Only active, approved doctors are listed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">Mentor</label>
          <Select value={selected} onValueChange={setSelected} disabled={fetching}>
            <SelectTrigger>
              <SelectValue placeholder={fetching ? "Loading doctors..." : "Select a doctor"} />
            </SelectTrigger>
            <SelectContent>
              {mentors.length === 0 && !fetching ? (
                <SelectItem value="__none" disabled>
                  No active doctors available
                </SelectItem>
              ) : (
                mentors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    {m.specialization ? ` — ${m.specialization}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || fetching || !selected}>
            {loading ? "Saving..." : isChange ? "Change Mentor" : "Assign Mentor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
