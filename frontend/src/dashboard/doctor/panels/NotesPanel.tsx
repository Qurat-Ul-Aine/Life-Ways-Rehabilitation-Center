import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  UserRound,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DoctorPanelAccordion, doctorPanelBody, doctorPanelHint, doctorPanelLabel } from "../components/DoctorPanelAccordion";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { doctorNotesService } from "../services/doctorNotesService";
import { doctorPatientPath } from "../utils/routes";
import api from "@/lib/api";
import type { ClinicalNoteItem, ClinicalNoteType } from "../types/doctor-notes.types";

const NOTE_TYPES: ClinicalNoteType[] = ["Progress note", "Session note", "Confidential"];

// Telehealth Notes Component
function TelehealthNotesSection({ appointmentId }: { appointmentId: string }) {
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments/${appointmentId}/telehealth/notes`)
      .then(res => {
        setNotes(res.data?.notes || "");
      })
      .catch(() => {
        setNotes("");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [appointmentId]);

  if (loading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="mb-2 flex items-center gap-2">
        <Video className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Telehealth session notes</span>
      </div>
      <p className={doctorPanelBody}>{notes || "No notes recorded for this session."}</p>
    </div>
  );
}

// Patient Feedback Component
function PatientFeedbackSection({ appointmentId }: { appointmentId: string }) {
  const [feedback, setFeedback] = useState<{ rating: number | null; comment: string | null }>({ rating: null, comment: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments/${appointmentId}/feedback`)
      .then(res => {
        setFeedback({ rating: res.data.rating, comment: res.data.comment });
      })
      .catch(() => {
        setFeedback({ rating: null, comment: null });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [appointmentId]);

  if (loading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (!feedback.rating) {
    return (
      <div className="rounded-lg bg-muted p-3">
        <p className="text-sm font-semibold text-foreground">Patient feedback</p>
        <p className={cn(doctorPanelHint, "mt-1")}>No feedback submitted yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-sm font-semibold text-foreground">Patient feedback</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= (feedback.rating ?? 0) ? "text-yellow-400" : "text-gray-300"}
          >
            ★
          </span>
        ))}
      </div>
      {feedback.comment ? (
        <p className={cn(doctorPanelBody, "mt-2 text-muted-foreground")}>{feedback.comment}</p>
      ) : null}
    </div>
  );
}

// Recent Telehealth Notes Component
function RecentTelehealthNotes({ patientId }: { patientId: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments?patientId=${patientId}`)
      .then(res => {
        const items = res.data?.items || res.data || [];
        const telehealth = items
          .filter((a: any) => a.mode === "online" && (a.status === "COMPLETED" || a.status === "completed"))
          .slice(0, 3);
        setAppointments(telehealth);
      })
      .catch(() => {
        setAppointments([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (appointments.length === 0) {
    return (
      <p className={doctorPanelHint}>No completed telehealth sessions for this patient yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((apt) => (
        <div key={apt.id} className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
          <TelehealthNotesSection appointmentId={apt.id} />
          <PatientFeedbackSection appointmentId={apt.id} />
        </div>
      ))}
    </div>
  );
}

const formatNoteDate = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const noteTypeVariant = (
  type: ClinicalNoteType,
): "default" | "secondary" | "outline" | "destructive" => {
  if (type === "Confidential") return "destructive";
  if (type === "Session note") return "secondary";
  return "outline";
};

const NotesPanel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: dashboardData, loading: dashboardLoading, refetch: refetchDashboard } =
    useDoctorDashboard();

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof doctorNotesService.loadSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedType, setSelectedType] = useState<ClinicalNoteType>("Progress note");
  const [noteContent, setNoteContent] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const patients = dashboardData?.patientRecovery ?? dashboardData?.patients ?? [];

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await doctorNotesService.loadSummary();
      setSummary(result);
    } catch (err) {
      setError(doctorNotesService.toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const patientFromUrl = searchParams.get("patient");
    if (patientFromUrl) setSelectedPatientId(patientFromUrl);
  }, [searchParams]);

  const applyPendingNote = useCallback((item: ClinicalNoteItem) => {
    setSelectedPatientId(item.patientId);
    setSelectedType(item.noteType);
    setNoteContent(item.content);
    setActiveSessionId(item.sessionId);
  }, []);

  const resetForm = () => {
    setNoteContent("");
    setActiveSessionId(null);
    setSelectedType("Progress note");
  };

  const handleSave = async (isDraft: boolean) => {
    if (!selectedPatientId) {
      toast.error("Select a patient first.");
      return;
    }
    if (!noteContent.trim()) {
      toast.error("Write note content before saving.");
      return;
    }

    setSaving(true);
    try {
      await doctorNotesService.saveNote({
        patientId: selectedPatientId,
        noteType: selectedType,
        content: noteContent,
        sessionId: activeSessionId,
        isDraft,
      });
      toast.success(isDraft ? "Draft saved." : "Clinical note saved.");
      resetForm();
      await Promise.all([loadNotes(), refetchDashboard()]);
    } catch (err) {
      toast.error(doctorNotesService.toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: summary?.total ?? 0,
      pending: summary?.pending ?? dashboardData?.stats?.pendingNotes ?? 0,
      documented: summary?.documented ?? 0,
      patients: summary?.patientCount ?? patients.length,
    }),
    [summary, dashboardData?.stats?.pendingNotes, patients.length],
  );

  const isLoading = loading || dashboardLoading;

  if (error) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-base font-semibold text-foreground">
              Failed to load clinical notes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void loadNotes()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total notes", value: stats.total, hint: "Documented and pending", tone: "text-primary" },
          { label: "Pending", value: stats.pending, hint: "Still need writing", tone: "text-amber-600" },
          { label: "Patients", value: stats.patients, hint: "Under your care", tone: "text-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="p-5">
              <p className={doctorPanelLabel}>{stat.label}</p>
              <p className={cn("mt-1 font-heading text-3xl font-bold tabular-nums", stat.tone)}>
                {isLoading ? "—" : stat.value}
              </p>
              <p className={cn(doctorPanelHint, "mt-1")}>{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(summary?.pendingItems.length ?? 0) > 0 && (
        <DoctorPanelAccordion
          title="Pending documentation"
          description="Sessions that still need a clinical note or draft completion"
          badge={summary?.pendingItems.length}
          icon={<Clock className="h-[18px] w-[18px]" aria-hidden />}
          tone="warning"
          defaultOpen
        >
          <div className="space-y-2">
            {summary?.pendingItems.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyPendingNote(item)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{item.patientName}</p>
                  <p className={cn(doctorPanelHint, "truncate")}>
                    {item.program} ·{" "}
                    {item.status === "draft" ? "Draft in progress" : "Session completed — note missing"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {item.status === "draft" ? "Draft" : "Pending"}
                </Badge>
              </button>
            ))}
          </div>
        </DoctorPanelAccordion>
      )}

      <DoctorPanelAccordion
        title="Write clinical note"
        description="Create progress notes, session notes, or confidential entries"
        icon={<FileText className="h-[18px] w-[18px]" aria-hidden />}
        defaultOpen={(summary?.pendingItems.length ?? 0) === 0}
      >
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={() => void loadNotes()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className={doctorPanelLabel}>Patient</p>
            {isLoading ? (
              <Skeleton className="h-11 w-full rounded-md" />
            ) : (
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="h-11 text-sm">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name} — {"condition" in p ? p.condition : p.program ?? "Rehabilitation"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <p className={doctorPanelLabel}>Note type</p>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={selectedType === type ? "default" : "outline"}
                  className="h-9 text-sm"
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={doctorPanelLabel}>Note content</p>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={7}
              placeholder="Write your clinical note here — observations, progress, and plan for next visit…"
              className="resize-none text-sm leading-relaxed sm:text-[15px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5 text-sm"
              disabled={saving || !selectedPatientId || !noteContent.trim()}
              onClick={() => void handleSave(false)}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {saving ? "Saving…" : "Save note"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 text-sm"
              disabled={saving || !noteContent.trim() || selectedType === "Confidential"}
              onClick={() => void handleSave(true)}
            >
              Save as draft
            </Button>
            {selectedPatientId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 gap-1.5 text-sm"
                onClick={() => navigate(doctorPatientPath(selectedPatientId))}
              >
                <UserRound className="h-4 w-4" aria-hidden />
                View patient
              </Button>
            ) : null}
          </div>
        </div>
      </DoctorPanelAccordion>

      <DoctorPanelAccordion
        title="Recent clinical notes"
        description="Previously saved notes — open to edit or review"
        badge={summary?.recentItems.length ?? 0}
        icon={<FileText className="h-[18px] w-[18px]" aria-hidden />}
        defaultOpen
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (summary?.recentItems.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
            <p className="text-base font-semibold text-foreground">No notes yet</p>
            <p className={cn(doctorPanelHint, "mt-1 max-w-sm")}>
              Saved session and progress notes will appear here for quick review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary?.recentItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{item.patientName}</p>
                      <Badge variant={noteTypeVariant(item.noteType)} className="text-xs">
                        {item.noteType}
                      </Badge>
                    </div>
                    <p className={cn(doctorPanelHint, "mt-0.5")}>{item.program}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" aria-hidden />
                    {formatNoteDate(item.sessionDate)}
                  </span>
                </div>
                <p className={cn(doctorPanelBody, "mt-3 line-clamp-4 text-muted-foreground")}>
                  {item.content}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-sm"
                    onClick={() => applyPendingNote(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-sm"
                    onClick={() => navigate(doctorPatientPath(item.patientId))}
                  >
                    View patient
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DoctorPanelAccordion>

      {selectedPatientId ? (
        <DoctorPanelAccordion
          title="Telehealth notes & feedback"
          description="Notes and ratings from completed online sessions"
          icon={<Video className="h-[18px] w-[18px]" aria-hidden />}
        >
          <RecentTelehealthNotes patientId={selectedPatientId} />
        </DoctorPanelAccordion>
      ) : null}
    </div>
  );
};

export default NotesPanel;
