import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TrainingLogForm from "./TrainingLogForm";
import type { TrainingLog, TrainingLogPayload } from "../intern.types";
import { isTrainingLogLocked } from "../intern.types";

type Props = {
  open: boolean;
  log: TrainingLog | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (logId: string, payload: TrainingLogPayload) => Promise<void>;
};

export default function TrainingLogEditDialog({
  open,
  log,
  loading,
  onOpenChange,
  onSave,
}: Props) {
  if (!log) return null;

  const locked = isTrainingLogLocked(log);

  const initialValues: TrainingLogPayload = {
    logDate: log.logDate ?? "",
    hoursWorked: log.hoursWorked,
    tasksCompleted: log.tasksCompleted ?? "",
    learningNotes: log.learningNotes ?? "",
    skillsLearned: log.skillsLearned,
    challenges: log.challenges,
    logType: log.logType,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Training Log</DialogTitle>
          <DialogDescription>
            {locked
              ? "This record has already been reviewed and can no longer be edited."
              : "Update your training log entry. Changes are saved to the existing record."}
          </DialogDescription>
        </DialogHeader>
        {locked ? null : (
          <TrainingLogForm
            mode="edit"
            loading={loading}
            initialValues={initialValues}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (payload) => {
              try {
                await onSave(log.id, payload);
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update log.");
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
