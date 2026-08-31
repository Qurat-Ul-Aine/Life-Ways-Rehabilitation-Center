import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendancePayload } from "../intern.types";
import { ATTENDANCE_PERIOD_TYPES } from "../constants";

type Props = {
  loading?: boolean;
  initialValues?: AttendancePayload;
  mode?: "create" | "edit";
  onSubmit: (payload: AttendancePayload) => void | Promise<void>;
  onCancel?: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): AttendancePayload => ({
  recordDate: today(),
  status: "present",
  periodType: "daily",
  hoursWorked: 0,
  checkIn: "",
  checkOut: "",
  remarks: "",
});

export default function AttendanceForm({
  loading,
  initialValues,
  mode = "create",
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<AttendancePayload>(initialValues ?? emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initialValues ?? emptyForm());
    setErrors({});
  }, [initialValues, mode]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.recordDate) next.recordDate = "Date is required.";
    else if (Number.isNaN(Date.parse(form.recordDate))) next.recordDate = "Invalid date.";
    if (form.hoursWorked < 0 || form.hoursWorked > 24) {
      next.hoursWorked = "Hours must be between 0 and 24.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: AttendancePayload = {
      ...form,
      status: form.periodType === "weekly" ? "weekly" : form.status,
    };
    await onSubmit(payload);
    if (mode === "create") {
      setForm(emptyForm());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="recordDate">Date *</Label>
          <Input
            id="recordDate"
            type="date"
            value={form.recordDate}
            onChange={(e) => setForm((f) => ({ ...f, recordDate: e.target.value }))}
          />
          {errors.recordDate ? (
            <p className="text-xs text-destructive">{errors.recordDate}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="periodType">Period Type *</Label>
          <Select
            value={form.periodType ?? "daily"}
            onValueChange={(value: "daily" | "weekly") =>
              setForm((f) => ({ ...f, periodType: value }))
            }
          >
            <SelectTrigger id="periodType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTENDANCE_PERIOD_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={form.status}
            onValueChange={(value: AttendancePayload["status"]) =>
              setForm((f) => ({ ...f, status: value }))
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hoursWorked">Hours Worked</Label>
          <Input
            id="hoursWorked"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={form.hoursWorked}
            onChange={(e) =>
              setForm((f) => ({ ...f, hoursWorked: Number(e.target.value) }))
            }
          />
          {errors.hoursWorked ? (
            <p className="text-xs text-destructive">{errors.hoursWorked}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkIn">Check In</Label>
          <Input
            id="checkIn"
            type="time"
            value={form.checkIn ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkOut">Check Out</Label>
          <Input
            id="checkOut"
            type="time"
            value={form.checkOut ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          rows={2}
          value={form.remarks ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          placeholder="Optional notes about this attendance entry..."
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Attendance"}
        </Button>
      </div>
    </form>
  );
}
