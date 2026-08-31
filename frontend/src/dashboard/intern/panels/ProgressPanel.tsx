import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { DashboardState } from "../sections/DashboardState";

export default function ProgressPanel() {
  return (
    <DashboardState>
      {(data) => {
        const progress = data.progress ?? {
          completedHours: data.stats.completedHours ?? data.stats.totalHours,
          remainingHours: data.stats.remainingHours ?? 0,
          requiredHours: data.stats.requiredHours ?? 480,
          attendancePercentage: data.stats.attendancePercentage,
          tasksCompleted: data.stats.tasksCompleted,
          trainingProgress: data.stats.trainingProgress ?? data.stats.progress,
          completionPercentage: data.stats.completionPercentage ?? data.stats.progress,
          timelineProgress: data.stats.progress,
          hoursProgress: 0,
          evaluationCount: 0,
        };

        return (
          <div className="space-y-6">
            <PageHeader
              title="Training Progress"
              subtitle="Track your internship hours, attendance, and completion status."
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={progress.completionPercentage} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {progress.completionPercentage}% complete
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Hours Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{progress.completedHours.toFixed(1)}h</p>
                  <Progress value={progress.hoursProgress} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {progress.remainingHours.toFixed(1)}h remaining of {progress.requiredHours}h
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{progress.attendancePercentage}%</p>
                  <Progress value={progress.attendancePercentage} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tasks Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{progress.tasksCompleted}</p>
                  <p className="text-xs text-muted-foreground">Training logs with tasks recorded</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </DashboardState>
  );
}
