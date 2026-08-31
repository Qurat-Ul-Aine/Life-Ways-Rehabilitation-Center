import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  intern: Intern;
  onAssigned: (updated: Intern) => void;
};

export default function MentorAssign({ intern, onAssigned }: Props) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selected, setSelected] = useState(intern.mentorId ?? "");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    internService
      .listMentors()
      .then(setMentors)
      .catch((err) => toast.error(err.message))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    setSelected(intern.mentorId ?? "");
  }, [intern.mentorId]);

  const handleAssign = async () => {
    if (!selected) {
      toast.error("Please select a mentor.");
      return;
    }
    setLoading(true);
    try {
      const updated = await internService.assignMentor(intern.id, selected);
      toast.success("Mentor assigned successfully.");
      onAssigned(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign mentor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <Select
          value={selected}
          onValueChange={setSelected}
          disabled={fetching}
        >
          <SelectTrigger>
            <SelectValue placeholder={fetching ? "Loading mentors..." : "Select mentor"} />
          </SelectTrigger>
          <SelectContent>
            {mentors.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
                {m.specialization ? ` — ${m.specialization}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleAssign} disabled={loading || fetching}>
        {loading
          ? "Saving..."
          : intern.mentorId
            ? "Change Mentor"
            : "Assign Mentor"}
      </Button>
    </div>
  );
}
