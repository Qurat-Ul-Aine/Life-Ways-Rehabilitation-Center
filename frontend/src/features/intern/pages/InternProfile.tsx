import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarCheck, History, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AttendanceList from "../components/AttendanceList";
import InternAdminActions, { InternAuditLogPanel } from "../components/InternAdminActions";
import MentorAssign from "../components/MentorAssign";
import TrainingLogForm from "../components/TrainingLogForm";
import TrainingLogsList from "../components/TrainingLogsList";
import { useInternLogs, useInternMember } from "../hooks/useIntern";
import { internAdminRoutes } from "../intern.routes";
import { internService } from "../services/internService";
import type { AttendanceRecord } from "../intern.types";

export default function InternProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading, error, setMember, refetch } = useInternMember(id);
  const [fromDate, setFromDate] = useState<string>();
  const [toDate, setToDate] = useState<string>();
  const [logLoading, setLogLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const {
    items: logs,
    totalHours,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useInternLogs(id, fromDate, toDate);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-muted-foreground">Loading intern profile...</p>
      </DashboardLayout>
    );
  }

  if (error || !member) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-destructive">{error ?? "Intern not found."}</p>
        <Button variant="outline" className="ml-6" onClick={() => navigate(internAdminRoutes.list)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={member.name}
        subtitle={`${member.department} • ${member.education}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(internAdminRoutes.list)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button asChild>
              <Link to={internAdminRoutes.edit(member.id)}>Edit Profile</Link>
            </Button>
          </div>
        }
      />

      <InternAdminActions
        intern={member}
        onUpdated={(updated) => {
          setMember(updated);
          refetch();
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {member.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {member.phone || "—"}
            </p>
            <Badge variant={member.isActive ? "default" : "outline"}>
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Internship Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Start: </span>
              {member.internshipStart ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">End: </span>
              {member.internshipEnd ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCheck className="h-4 w-4" /> Assigned Mentor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {member.mentor ? (
              <div>
                <p className="font-medium">{member.mentor.name}</p>
                <p className="text-muted-foreground">{member.mentor.specialization || member.mentor.email}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No mentor assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mentor" className="mt-6">
        <TabsList>
          <TabsTrigger value="mentor">Mentor Assignment</TabsTrigger>
          <TabsTrigger value="logs">
            <BookOpen className="mr-1 h-4 w-4" /> Training Logs
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            onClick={() => {
              if (!id || attendance.length) return;
              setAttendanceLoading(true);
              internService
                .getAttendance(id)
                .then((data) => {
                  const result = data as { items?: AttendanceRecord[]; history?: AttendanceRecord[] };
                  setAttendance(result.items ?? result.history ?? []);
                })
                .catch((err) =>
                  toast.error(err instanceof Error ? err.message : "Failed to load attendance."),
                )
                .finally(() => setAttendanceLoading(false));
            }}
          >
            <CalendarCheck className="mr-1 h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="mr-1 h-4 w-4" /> Audit History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mentor" className="mt-4">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Assign Supervisor / Mentor</CardTitle>
              <CardDescription>
                Select an approved doctor to supervise this intern. The mentor will be notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <MentorAssign
                intern={member}
                onAssigned={(updated) => {
                  setMember(updated);
                  refetch();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-6">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Add Training Log</CardTitle>
              <CardDescription>Record daily hours, tasks, and learning notes.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TrainingLogForm
                loading={logLoading}
                onSubmit={async (payload) => {
                  if (!id) return;
                  setLogLoading(true);
                  try {
                    await internService.addLog(id, payload);
                    toast.success("Training log added successfully.");
                    refetchLogs();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to add log.");
                  } finally {
                    setLogLoading(false);
                  }
                }}
              />
            </CardContent>
          </Card>

          <TrainingLogsList
            logs={logs}
            totalHours={totalHours}
            loading={logsLoading}
            fromDate={fromDate}
            toDate={toDate}
            onFilterChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceList records={attendance} loading={attendanceLoading} />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Audit History</CardTitle>
              <CardDescription>Administrative changes to this intern record.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {id ? <InternAuditLogPanel internId={id} /> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
