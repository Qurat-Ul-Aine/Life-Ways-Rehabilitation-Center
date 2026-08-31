import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AttendanceForm from "./AttendanceForm";
import type { AttendancePayload, AttendanceRecord } from "../intern.types";
import { isAttendanceLocked } from "../intern.types";

type Props = {
  open: boolean;
  record: AttendanceRecord | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (attendanceId: string, payload: AttendancePayload) => Promise<void>;
};

export default function AttendanceEditDialog({
  open,
  record,
  loading,
  onOpenChange,
  onSave,
}: Props) {
  if (!record) return null;

  const locked = isAttendanceLocked(record);

  const initialValues: AttendancePayload = {
    recordDate: record.recordDate ?? record.date,
    status: record.status,
    hoursWorked: record.hoursWorked ?? record.hours,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    remarks: record.remarks,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            {locked
              ? "This record has already been reviewed and can no longer be edited."
              : "Update your attendance entry. Changes are saved to the existing record."}
          </DialogDescription>
        </DialogHeader>
        {locked ? null : (
          <AttendanceForm
            mode="edit"
            loading={loading}
            initialValues={initialValues}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (payload) => {
              try {
                await onSave(record.id, payload);
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update attendance.");
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
