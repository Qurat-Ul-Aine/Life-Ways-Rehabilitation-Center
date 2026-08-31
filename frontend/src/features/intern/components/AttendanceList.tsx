import { CheckCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecord } from "../intern.types";
import { isAttendanceLocked } from "../intern.types";

type Props = {
  records: AttendanceRecord[];
  loading?: boolean;
  onEdit?: (record: AttendanceRecord) => void;
  onApprove?: (record: AttendanceRecord) => void;
  mentorMode?: boolean;
};

export default function AttendanceList({ records, loading, onEdit, onApprove, mentorMode }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No attendance records yet. Add your first attendance entry above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Hours</TableHead>
          <TableHead>Check In/Out</TableHead>
          <TableHead>Remarks</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const locked = isAttendanceLocked(record);
          return (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">{record.date}</TableCell>
              <TableCell>
                <Badge variant={record.status === "present" ? "secondary" : "outline"} className="capitalize">
                  {record.status}
                </Badge>
                {locked ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Reviewed
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>{record.hours}h</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {record.checkIn || record.checkOut
                  ? `${record.checkIn || "—"} → ${record.checkOut || "—"}`
                  : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{record.remarks || "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {mentorMode && onApprove && !locked ? (
                    <Button variant="outline" size="sm" onClick={() => onApprove(record)}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  ) : null}
                  {onEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={locked}
                      title={
                        locked
                          ? "This record has already been reviewed and can no longer be edited."
                          : "Edit attendance"
                      }
                      onClick={() => onEdit(record)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
