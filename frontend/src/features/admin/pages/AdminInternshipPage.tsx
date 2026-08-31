import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import MentorAssignDialog from "@/features/intern/components/MentorAssignDialog";
import StatisticsCards from "@/features/intern/components/StatisticsCards";
import { internService } from "@/features/intern/services/internService";
import { APPLICATION_STATUS_LABELS } from "@/features/intern/constants";
import type { Intern } from "@/features/intern/intern.types";
import { INTERN_ADMIN_BASE } from "@/features/intern/intern.routes";

type MentorDialogState = {
  internId: string;
  internName: string;
  mentorId: string | null;
} | null;

function statusVariant(status?: string) {
  const s = String(status ?? "").toUpperCase();
  if (s === "ACTIVE") return "default" as const;
  if (s === "PENDING") return "outline" as const;
  if (s === "COMPLETED") return "secondary" as const;
  return "secondary" as const;
}

export default function AdminInternshipPage() {
  const [items, setItems] = useState<Intern[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mentorDialog, setMentorDialog] = useState<MentorDialogState>(null);

  const loadInternees = useCallback(async () => {
    const result = await internService.list({ page: 1, pageSize: 100, includeInactive: true });
    setItems(result.items);
    setTotal(result.total);
  }, []);

  useEffect(() => {
    loadInternees()
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load interns."))
      .finally(() => setLoading(false));
  }, [loadInternees]);

  const activeCount = items.filter((i) => i.applicationStatus === "ACTIVE" || i.isActive).length;
  const pendingCount = items.filter((i) => i.applicationStatus === "PENDING").length;
  const completingSoon = items.filter((i) => {
    if (!i.internshipEnd) return false;
    const end = new Date(i.internshipEnd);
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    return end <= in30 && end >= new Date();
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internship Program"
        subtitle="Manage clinical interns, mentors, and placement schedules"
      />

      <StatisticsCards
        loading={loading}
        stats={[
          { label: "Total Interns", value: total },
          { label: "Active", value: activeCount },
          { label: "Pending Approval", value: pendingCount },
          { label: "Completing Soon", value: completingSoon },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Intern roster</CardTitle>
              <CardDescription>Internship records from the database</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading interns...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interns registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link to={`${INTERN_ADMIN_BASE}/${row.id}`} className="hover:underline">
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>
                      {row.mentorName ? row.mentorName : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{row.internshipStart?.slice(0, 10) ?? "—"}</TableCell>
                    <TableCell>{row.internshipEnd?.slice(0, 10) ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.applicationStatus)}>
                        {APPLICATION_STATUS_LABELS[row.applicationStatus ?? "ACTIVE"] ??
                          row.applicationStatus ??
                          "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={row.mentorId ? "outline" : "default"}
                        size="sm"
                        onClick={() =>
                          setMentorDialog({
                            internId: row.id,
                            internName: row.name,
                            mentorId: row.mentorId ?? null,
                          })
                        }
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {row.mentorId ? "Change Mentor" : "Assign Mentor"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {mentorDialog ? (
        <MentorAssignDialog
          open
          onOpenChange={(open) => {
            if (!open) setMentorDialog(null);
          }}
          internId={mentorDialog.internId}
          internName={mentorDialog.internName}
          currentMentorId={mentorDialog.mentorId}
          onAssigned={async () => {
            try {
              await loadInternees();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to refresh intern list.");
            }
          }}
        />
      ) : null}
    </div>
  );
}
