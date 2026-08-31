import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Plus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useInternDashboard } from "../hooks/useIntern";
import { INTERN_AUTH, INTERNSHIPS_PUBLIC } from "../intern.routes";

export default function InternDashboard() {
  const { data, loading, error } = useInternDashboard();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-destructive">{error ?? "Dashboard unavailable."}</p>
      </DashboardLayout>
    );
  }

  const { intern, stats, recentLogs } = data;

  return (
    <DashboardLayout>
      <PageHeader
        title="Intern Dashboard"
        subtitle={`Welcome back, ${intern.name}. Track your rehabilitation training progress.`}
        action={
          <Button asChild>
            <Link to={INTERN_AUTH.logs}>
              <Plus className="mr-1 h-4 w-4" /> Training Logs
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:border-sidebar-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Logs
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalLogs}</p>
            <p className="text-xs text-muted-foreground">Training entries recorded</p>
          </CardContent>
        </Card>

        <Card className="dark:border-sidebar-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Clinical hours logged</p>
          </CardContent>
        </Card>

        <Card className="dark:border-sidebar-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Mentor
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{intern.mentor?.name ?? "Unassigned"}</p>
            <p className="text-xs text-muted-foreground">
              {intern.mentor?.specialization ?? "Awaiting mentor assignment"}
            </p>
          </CardContent>
        </Card>

        <Card className="dark:border-sidebar-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Internship Progress
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{stats.progress}%</p>
            <Progress value={stats.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {intern.internshipStart ?? "—"} → {intern.internshipEnd ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 dark:border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-base">Recent Training Logs</CardTitle>
            <CardDescription>Your latest clinical training and attendance entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet. Add your first entry.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-lg border p-3 dark:border-sidebar-border"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{log.logDate}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {log.tasksCompleted || log.learningNotes || "No details recorded."}
                      </p>
                    </div>
                    <Badge variant="secondary">{log.hoursWorked}h</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link to={INTERN_AUTH.logs}>
                <Plus className="mr-2 h-4 w-4" /> Add Training Log
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={INTERNSHIPS_PUBLIC}>Program Info</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
