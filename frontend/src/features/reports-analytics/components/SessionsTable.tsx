import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "../utils/calculations";

export interface SessionTableRow {
  id?: string;
  label: string;
  total?: number;
  completed?: number;
  missed?: number;
  cancelled?: number;
  attendanceRate?: number;
  progressPercent?: number;
  extra?: string;
}

interface SessionsTableProps {
  title: string;
  rows: SessionTableRow[];
  emptyMessage?: string;
}

export default function SessionsTable({
  title,
  rows,
  emptyMessage = "No sessions found for this period.",
}: SessionsTableProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Missed</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id ?? row.label}>
                  <TableCell className="font-medium">
                    {row.label}
                    {row.extra && (
                      <span className="ml-2 text-xs text-muted-foreground">{row.extra}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.total ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.completed ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.missed ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.cancelled ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {row.attendanceRate != null ? (
                      <Badge variant="secondary">{formatPercent(row.attendanceRate)}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.progressPercent != null ? formatPercent(row.progressPercent) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
