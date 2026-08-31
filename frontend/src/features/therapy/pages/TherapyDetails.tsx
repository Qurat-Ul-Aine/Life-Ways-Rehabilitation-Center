import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import ExerciseUploader from "../components/ExerciseUploader";
import SessionNotesForm, { type SessionNotesFormValues } from "../components/SessionNotesForm";
import SessionNotesHistory from "../components/SessionNotesHistory";
import { therapyService } from "../services/therapyService";
import { exportTherapyReport } from "../utils/exportTherapy";
import { getTherapyPermissions } from "../utils/therapyPermissions";
import type { TherapyPlan } from "../therapy.types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  paused: "outline",
  cancelled: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  paused: "On Hold",
  cancelled: "Cancelled",
};

export default function TherapyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "patient";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";
  const perms = getTherapyPermissions(role);

  const [plan, setPlan] = useState<TherapyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionFormKey, setSessionFormKey] = useState(0);

  const reloadPlan = () => {
    if (!id) return Promise.resolve();
    return therapyService.getPlan(id).then(setPlan);
  };

  const handleExportReport = async () => {
    if (!plan) return;
    setExporting(true);
    try {
      const freshPlan = await therapyService.getPlan(plan.id);
      const summary = await therapyService.getReport(plan.id);
      exportTherapyReport(freshPlan, summary);
      toast.success("Report ready — choose Save as PDF in the print dialog.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    reloadPlan()
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <p className="text-sm text-muted-foreground p-6">Loading...</p>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <p className="text-sm text-destructive p-6">Plan not found.</p>
      </>
    );
  }

  const patientName = plan.patientName ?? plan.patients?.users?.name ?? "—";
  const doctorName = plan.therapistName ?? plan.doctors?.users?.name ?? "—";
  const type = plan.therapy_type ?? plan.title ?? "—";
  const status = String(plan.status ?? "active").toLowerCase();
  const statusLabel = STATUS_LABEL[status] ?? status;
  const goals = plan.goals ?? [];
  const exercises = plan.therapy_exercises ?? plan.exercises ?? [];
  const sessions = plan.therapy_sessions ?? [];
  const diagnosis = plan.diagnosis?.trim() || "—";
  const description = plan.description?.trim() || "—";
  const frequency = plan.frequencyPerWeek ?? plan.frequency_per_week ?? 0;
  const startDate = plan.start_date?.slice(0, 10) ?? plan.startDate?.slice(0, 10) ?? "—";
  const endDate = plan.end_date?.slice(0, 10) ?? plan.endDate?.slice(0, 10) ?? "—";

  const handleSaveSessionNotes = async (values: SessionNotesFormValues) => {
    setSavingSession(true);
    try {
      await therapyService.recordSession({
        planId: plan.id,
        session_date: values.session_date,
        duration: values.duration,
        session_type: values.session_type,
        chief_complaint: values.chief_complaint,
        observations: values.observations,
        progress_notes: values.progress_notes,
        exercises_discussed: values.exercises_discussed,
        next_steps: values.next_steps,
        confidential_notes: values.confidential_notes,
        status: values.status,
        mood: values.mood || undefined,
        outcome: values.outcome as "improved" | "no-change" | "regressed" | "n/a",
        pain_level: values.pain_level ? Number(values.pain_level) : undefined,
      });
      toast.success("Session notes saved.");
      setSessionFormKey((k) => k + 1);
      await reloadPlan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save session notes.");
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <>
      <PageHeader
        title={type}
        subtitle={`${patientName} · ${doctorName}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`${basePath}/therapy`)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={() => void handleExportReport()}
            >
              <FileText className="h-4 w-4" />
              {exporting ? "Preparing…" : "Report"}
            </Button>
            {perms.canEditTherapyPlan && (
              <Button asChild>
                <Link to={`${basePath}/therapy/${plan.id}/edit`}>Edit</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Overview</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Patient" value={patientName} />
            <Info label="Assigned Therapist" value={doctorName} />
            <Info label="Therapy Type" value={type} />
            <Info
              label="Status"
              value={<Badge variant={STATUS_VARIANT[status] ?? "outline"}>{statusLabel}</Badge>}
            />
            <Info label="Diagnosis" value={diagnosis} />
            <Info label="Sessions / Week" value={frequency > 0 ? String(frequency) : "—"} />
            <Info label="Start Date" value={startDate} />
            <Info label="End Date" value={endDate} />
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-line">{description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goals</CardTitle>
            <CardDescription>{goals.length} goal(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals defined.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Session notes</CardTitle>
          <CardDescription>
            {perms.canViewConfidentialNotes
              ? "Full session history including confidential notes."
              : "Session history from your therapy appointments."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SessionNotesHistory
            planId={plan.id}
            sessions={sessions}
            therapist={doctorName}
            showConfidential={perms.canViewConfidentialNotes}
            canEdit={perms.canEditSessionNotes}
            onUpdated={() => void reloadPlan().catch(() => {})}
          />
          {perms.canAddSessionNotes && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium mb-3">Add session notes</p>
              <SessionNotesForm
                key={sessionFormKey}
                exercises={exercises}
                showConfidential
                saving={savingSession}
                onSave={handleSaveSessionNotes}
                onReset={() => setSessionFormKey((k) => k + 1)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Exercises & Resources</CardTitle>
          <CardDescription>
            {perms.canManageExercises
              ? "Upload videos/documents or add text instructions for the patient."
              : "Resources assigned by your care team."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseUploader
            planId={plan.id}
            canUpload={perms.canManageExercises}
            exercises={exercises}
            onExercisesChange={() => void reloadPlan().catch(() => {})}
          />
        </CardContent>
      </Card>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
