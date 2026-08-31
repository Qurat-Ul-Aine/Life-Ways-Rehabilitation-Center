import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/common/PageHeader";
import { DashboardState } from "./DashboardState";

const statusVariant = (status: string) => {
  if (status === "Active") return "secondary";
  if (status === "Completed") return "outline";
  return "destructive";
};

export default function SummarySection() {
  return (
    <DashboardState>
      {(data) => {
        const { intern, stats } = data;

        return (
          <div className="space-y-6">
            <PageHeader
              title="Overview"
              subtitle="Summary of your internship training progress and status."
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Training Hours
                  </CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{stats.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Clinical hours logged</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Attendance
                  </CardTitle>
                  <CalendarCheck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{stats.attendancePercentage}%</p>
                  <p className="text-xs text-muted-foreground">
                    {data.attendance.presentDays} of {data.attendance.expectedDays} weekdays
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tasks Completed
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{stats.tasksCompleted}</p>
                  <p className="text-xs text-muted-foreground">Logs with completed tasks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Internship Status
                  </CardTitle>
                  <GraduationCap className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={statusVariant(stats.internshipStatus)} className="capitalize">
                    {stats.internshipStatus}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {intern.internshipStart ?? "—"} → {intern.internshipEnd ?? "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Internship Timeline Progress
                </CardTitle>
                <BookOpen className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Program completion</span>
                  <span className="font-semibold">{stats.progress}%</span>
                </div>
                <Progress value={stats.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.totalLogs} training log{stats.totalLogs === 1 ? "" : "s"} recorded
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }}
    </DashboardState>
  );
}
