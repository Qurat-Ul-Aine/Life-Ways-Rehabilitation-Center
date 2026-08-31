import { Link } from "react-router-dom";
import { BookOpen, CalendarCheck, Plus, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { INTERN_AUTH } from "@/features/intern/intern.routes";
import { DashboardState } from "./DashboardState";

export default function OverviewSection() {
  return (
    <DashboardState>
      {(data) => {
        const { intern, stats, recentLogs } = data;

        return (
          <div className="space-y-6">
            <PageHeader
              title="Intern Dashboard"
              subtitle={`Welcome back, ${intern.name}. Track your rehabilitation training progress.`}
              action={
                <Button asChild>
                  <Link to={INTERN_AUTH.logs}>
                    <Plus className="mr-1 h-4 w-4" /> Add Training Log
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Training Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{stats.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Logged to date</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{stats.attendancePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Based on training log days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Mentor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{intern.mentor?.name ?? "Unassigned"}</p>
                  <p className="text-xs text-muted-foreground">
                    {intern.mentor?.specialization ?? "Awaiting assignment"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Recent Training Logs</CardTitle>
                  <CardDescription>Your latest clinical training entries.</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No logs yet. Add your first training entry.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between rounded-lg border p-3"
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" asChild>
                    <Link to={INTERN_AUTH.logs}>
                      <BookOpen className="mr-2 h-4 w-4" /> Training Logs
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={INTERN_AUTH.attendance}>
                      <CalendarCheck className="mr-2 h-4 w-4" /> Attendance
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={INTERN_AUTH.mentor}>
                      <UserCheck className="mr-2 h-4 w-4" /> My Mentor
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </DashboardState>
  );
}
