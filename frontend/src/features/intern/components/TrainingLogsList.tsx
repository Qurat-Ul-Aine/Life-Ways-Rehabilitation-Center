import { CheckCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TrainingLog } from "../intern.types";
import { isTrainingLogLocked } from "../intern.types";

type Props = {
  logs: TrainingLog[];
  totalHours: number;
  loading?: boolean;
  fromDate?: string;
  toDate?: string;
  onFilterChange?: (from?: string, to?: string) => void;
  onEdit?: (log: TrainingLog) => void;
  onReview?: (log: TrainingLog) => void;
  mentorMode?: boolean;
};

export default function TrainingLogsList({
  logs,
  totalHours,
  loading,
  fromDate,
  toDate,
  onFilterChange,
  onEdit,
  onReview,
  mentorMode,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fromDate">From</Label>
          <Input
            id="fromDate"
            type="date"
            value={fromDate ?? ""}
            onChange={(e) => onFilterChange?.(e.target.value || undefined, toDate)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="toDate">To</Label>
          <Input
            id="toDate"
            type="date"
            value={toDate ?? ""}
            onChange={(e) => onFilterChange?.(fromDate, e.target.value || undefined)}
            className="w-[160px]"
          />
        </div>
        <Badge variant="secondary" className="mb-0.5">
          Total Hours: {totalHours.toFixed(1)}h
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Training Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No training logs recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Tasks Completed</TableHead>
                  <TableHead>Learning Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const locked = isTrainingLogLocked(log);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {log.logDate ?? "—"}
                      </TableCell>
                      <TableCell>{log.hoursWorked}h</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.tasksCompleted || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.learningNotes || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={locked ? "outline" : "secondary"} className="capitalize">
                          {locked ? "Reviewed" : log.status ?? "submitted"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {mentorMode && onReview && !locked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onReview(log)}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Review
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
                                  : "Edit training log"
                              }
                              onClick={() => onEdit(log)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
