import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, GraduationCap, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mentorInternService,
  type MentorInternsResult,
} from "../services/mentorInternService";

export default function MentorInternsListPage() {
  const [data, setData] = useState<MentorInternsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mentorInternService
      .listMyMentees()
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load interns."))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats ?? { assigned: 0, activeAssigned: 0, totalSupervisedHours: 0 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "My Assigned Interns",
            value: stats.assigned,
            icon: Users,
          },
          {
            label: "Active Placements",
            value: stats.activeAssigned,
            icon: GraduationCap,
          },
          {
            label: "Supervised Training Hours",
            value: `${stats.totalSupervisedHours.toFixed(1)}h`,
            icon: Clock,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-0.5 text-2xl font-bold text-foreground">
                    {loading ? "—" : stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-4 pb-0 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            My Assigned Interns
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Interns assigned to you as clinical mentor. Review progress, attendance, and training
            logs.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading assigned interns…</p>
          ) : !data?.items.length ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No interns assigned yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You will receive a notification when an admin assigns you as a mentor.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Training Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((intern) => (
                  <TableRow key={intern.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{intern.name}</p>
                        <p className="text-xs text-muted-foreground">{intern.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {intern.department || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {intern.internshipStart ?? "—"} → {intern.internshipEnd ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{intern.progress}%</TableCell>
                    <TableCell className="text-muted-foreground">
                      {intern.attendancePercentage}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {intern.totalHours.toFixed(1)}h ({intern.logCount} logs)
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{intern.internshipStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-[11px]"
                        asChild
                      >
                        <Link to={`/doctor/interns/${intern.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
