import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarCheck, Star, TrendingUp, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceList from "@/features/intern/components/AttendanceList";
import TrainingLogForm from "@/features/intern/components/TrainingLogForm";
import TrainingLogsList from "@/features/intern/components/TrainingLogsList";
import { internService } from "@/features/intern/services/internService";
import type {
  AttendanceRecord,
  Intern,
  InternEvaluation,
  TrainingLog,
  TrainingLogPayload,
  TrainingLogsResult,
} from "@/features/intern/intern.types";
import { mentorInternService } from "../services/mentorInternService";

type ApiAttendance = {
  id: string;
  recordDate: string | null;
  hoursWorked: number;
  status: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
};

function mapAttendanceItem(item: ApiAttendance): AttendanceRecord {
  return {
    id: item.id,
    date: item.recordDate ?? "",
    recordDate: item.recordDate ?? undefined,
    status: (item.status as AttendanceRecord["status"]) ?? "present",
    hours: item.hoursWorked,
    hoursWorked: item.hoursWorked,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    remarks: item.remarks,
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt,
  };
}

export default function MentorInternDetailPage() {
  const { internId = "" } = useParams();
  const [intern, setIntern] = useState<Intern | null>(null);
  const [logs, setLogs] = useState<TrainingLogsResult | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendancePct, setAttendancePct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [fromDate, setFromDate] = useState<string>();
  const [toDate, setToDate] = useState<string>();
  const [evaluations, setEvaluations] = useState<InternEvaluation[]>([]);
  const [evalRating, setEvalRating] = useState(4);
  const [evalComments, setEvalComments] = useState("");
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  const loadIntern = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    try {
      setIntern(await mentorInternService.getMentee(internId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load intern profile.");
      setIntern(null);
    } finally {
      setLoading(false);
    }
  }, [internId]);

  const loadLogs = useCallback(async () => {
    if (!internId) return;
    setLogsLoading(true);
    try {
      setLogs(await mentorInternService.getMenteeLogs(internId, { fromDate, toDate }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load training logs.");
    } finally {
      setLogsLoading(false);
    }
  }, [internId, fromDate, toDate]);

  const loadAttendance = useCallback(async () => {
    if (!internId) return;
    setAttendanceLoading(true);
    try {
      const result = (await internService.getAttendance(internId, {
        fromDate,
        toDate,
      })) as { items: ApiAttendance[]; attendancePercentage: number };
      setAttendance((result.items ?? []).map(mapAttendanceItem));
      setAttendancePct(result.attendancePercentage ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  }, [internId, fromDate, toDate]);

  useEffect(() => {
    void loadIntern();
  }, [loadIntern]);

  useEffect(() => {
    void loadLogs();
    void loadAttendance();
  }, [loadLogs, loadAttendance]);

  useEffect(() => {
    if (!internId) return;
    internService
      .getEvaluations(internId)
      .then((data) => {
        const rows = (data as { items?: InternEvaluation[] })?.items ?? [];
        setEvaluations(rows);
      })
      .catch(() => {
        /* evaluations optional until first submit */
      });
  }, [internId]);

  const handleAddLog = async (payload: TrainingLogPayload) => {
    if (!internId) return;
    setSavingLog(true);
    try {
      await internService.addLog(internId, payload);
      toast.success("Training log added.");
      await loadLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add log.");
    } finally {
      setSavingLog(false);
    }
  };

  const handleReviewLog = async (log: TrainingLog) => {
    try {
      await internService.reviewLog(log.id, "Reviewed by mentor.");
      toast.success("Training log marked as reviewed.");
      await loadLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review log.");
    }
  };

  const handleApproveAttendance = async (record: AttendanceRecord) => {
    try {
      await internService.approveAttendance(record.id);
      toast.success("Attendance approved.");
      await loadAttendance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve attendance.");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading intern profile…</p>;
  }

  if (!intern) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/doctor/interns">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to My Interns
          </Link>
        </Button>
        <p className="text-sm text-destructive">Intern not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/doctor/interns">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to My Interns
        </Link>
      </Button>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-4 pb-0 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">{intern.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{intern.email}</p>
            </div>
            <Badge variant={intern.isActive ? "default" : "outline"}>
              {intern.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{intern.department || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Education</p>
            <p className="text-sm font-medium">{intern.education || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Internship Period</p>
            <p className="text-sm font-medium">
              {intern.internshipStart ?? "—"} → {intern.internshipEnd ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{intern.phone || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Review Progress
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Training Logs
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-1.5">
            <Star className="h-3.5 w-3.5" /> Mentor Evaluation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Training Hours</p>
                <p className="mt-1 text-2xl font-bold">{logs?.totalHours.toFixed(1) ?? "0"}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Log Entries</p>
                <p className="mt-1 text-2xl font-bold">{logs?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
                <p className="mt-1 text-2xl font-bold">{attendancePct}%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Add Training Log (Mentor)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingLogForm loading={savingLog} onSubmit={(p) => void handleAddLog(p)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Training Log History</CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingLogsList
                logs={logs?.items ?? []}
                totalHours={logs?.totalHours ?? 0}
                loading={logsLoading}
                fromDate={fromDate}
                toDate={toDate}
                mentorMode
                onFilterChange={(from, to) => {
                  setFromDate(from);
                  setToDate(to);
                }}
                onReview={(log) => void handleReviewLog(log)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceList
                records={attendance}
                loading={attendanceLoading}
                mentorMode
                onApprove={(record) => void handleApproveAttendance(record)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Name: </span>
                {intern.name}
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                {intern.email}
              </p>
              <p>
                <span className="text-muted-foreground">Department: </span>
                {intern.department}
              </p>
              <p>
                <span className="text-muted-foreground">Education: </span>
                {intern.education}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Submit Mentor Evaluation</CardTitle>
              <CardDescription>Rate performance and provide feedback for {intern.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eval-rating">Rating (1–5)</Label>
                <input
                  id="eval-rating"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={evalRating}
                  onChange={(e) => setEvalRating(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">{evalRating} / 5</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eval-comments">Comments</Label>
                <Textarea
                  id="eval-comments"
                  rows={4}
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  placeholder="Strengths, areas for improvement, overall feedback..."
                />
              </div>
              <Button
                disabled={evalSubmitting}
                onClick={async () => {
                  setEvalSubmitting(true);
                  try {
                    await internService.addEvaluation(internId, {
                      rating: evalRating,
                      comments: evalComments.trim() || undefined,
                    });
                    toast.success("Evaluation submitted.");
                    setEvalComments("");
                    const data = await internService.getEvaluations(internId);
                    setEvaluations((data as { items?: InternEvaluation[] })?.items ?? []);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to submit evaluation.");
                  } finally {
                    setEvalSubmitting(false);
                  }
                }}
              >
                {evalSubmitting ? "Submitting..." : "Submit Evaluation"}
              </Button>
            </CardContent>
          </Card>

          {evaluations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Previous Evaluations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evaluations.map((ev) => (
                  <div key={ev.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{ev.rating ?? "—"} / 5</span>
                      <span className="text-xs text-muted-foreground">
                        {ev.evaluatedAt ? new Date(ev.evaluatedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    {ev.comments ? (
                      <p className="mt-2 text-muted-foreground">{ev.comments}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
