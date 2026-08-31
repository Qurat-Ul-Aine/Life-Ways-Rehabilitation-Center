import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { refreshPatientTherapy } from "@/features/patient/utils/patientTherapyRefresh";
import SessionNotesForm, {
  buildSessionNotesInitialValues,
  type SessionNotesFormValues,
} from "@/features/therapy/components/SessionNotesForm";
import {
  planDisplayName,
  useTelehealthTherapyPlans,
} from "../hooks/useTelehealthTherapyPlans";

type TelehealthNotesResponse = {
  notes?: string;
  session?: {
    session_date?: string;
    duration?: number;
    session_type?: string;
    chief_complaint?: string;
    observations?: string;
    progress_notes?: string;
    exercises_discussed?: string[];
    next_steps?: string;
    confidential_notes?: string;
    status?: string;
    outcome?: string;
    pain_level?: number;
    mood?: string;
  } | null;
};

type SaveNotesResponse = {
  success?: boolean;
  linked?: boolean;
  sessionId?: string | null;
  therapyPlanId?: string | null;
  message?: string;
  notes?: string;
};

type Props = {
  appointmentId: string;
};

export default function NotesPanel({ appointmentId }: Props) {
  const { plans, loading: plansLoading, error: plansError } =
    useTelehealthTherapyPlans(appointmentId);

  const [initialValues, setInitialValues] = useState<SessionNotesFormValues | undefined>();
  const [notesLoading, setNotesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    if (plans.length === 1) {
      setSelectedPlanId(plans[0].id);
    } else if (plans.length > 1 && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId("");
    } else if (plans.length === 0) {
      setSelectedPlanId("");
    }
  }, [plans, selectedPlanId]);

  useEffect(() => {
    setNotesLoading(true);
    api
      .get<TelehealthNotesResponse>(`/appointments/${appointmentId}/telehealth/notes`)
      .then((res) => {
        const session = res.data?.session;
        const discussed = session?.exercises_discussed ?? [];
        setInitialValues(
          buildSessionNotesInitialValues(
            {
              session_date: session?.session_date
                ? String(session.session_date).slice(0, 10)
                : undefined,
              duration: session?.duration ?? 45,
              session_type: (session?.session_type as "TELEHEALTH" | "IN_PERSON") ?? "TELEHEALTH",
              chief_complaint: session?.chief_complaint ?? "",
              observations: session?.observations ?? "",
              progress_notes: session?.progress_notes ?? res.data?.notes ?? "",
              exercises_discussed: discussed.join("\n"),
              next_steps: session?.next_steps ?? "",
              confidential_notes: session?.confidential_notes ?? "",
              status: session?.status ?? "COMPLETED",
              mood: session?.mood ?? "",
              outcome: session?.outcome ?? "no-change",
              pain_level:
                session?.pain_level != null ? String(session.pain_level) : "",
            },
            "TELEHEALTH",
          ),
        );
      })
      .catch(() => {
        setInitialValues(buildSessionNotesInitialValues(undefined, "TELEHEALTH"));
      })
      .finally(() => setNotesLoading(false));
  }, [appointmentId]);

  const handleSave = async (values: SessionNotesFormValues) => {
    if (!selectedPlanId) {
      toast.error("Select an active therapy plan before saving.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put<SaveNotesResponse>(
        `/appointments/${appointmentId}/telehealth/notes`,
        {
          therapy_plan_id: selectedPlanId,
          session_type: values.session_type,
          session_date: values.session_date,
          duration: values.duration,
          chief_complaint: values.chief_complaint,
          observations: values.observations,
          progress_notes: values.progress_notes,
          notes: values.progress_notes,
          exercises_discussed: values.exercises_discussed,
          next_steps: values.next_steps,
          confidential_notes: values.confidential_notes,
          status: values.status,
          mood: values.mood || undefined,
          outcome: values.outcome,
          pain_level: values.pain_level ? Number(values.pain_level) : undefined,
        },
      );

      const linked = Boolean(data?.linked && data?.sessionId);
      if (!linked || data?.success === false) {
        toast.error(
          data?.message ??
            "Notes could not be linked to the therapy plan. No orphan note was saved.",
        );
        return;
      }

      toast.success("Session notes saved — visible on patient Therapy Plan.");
      refreshPatientTherapy();
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to save notes");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const loading = plansLoading || notesLoading;
  const canSave = plans.length > 0 && Boolean(selectedPlanId);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4">
        <p className="text-sm text-muted-foreground">Loading session notes…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Saved notes sync to the patient&apos;s Therapy Plan panel.
          </p>
        </div>

        {plansError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {plansError}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-3 space-y-2">
            <p className="text-xs text-foreground flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
              Create or activate a therapy plan for this patient before saving session notes.
            </p>
            <Link
              to="/doctor/therapy/new"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <BookOpen size={12} />
              Create therapy plan
            </Link>
          </div>
        ) : plans.length === 1 && selectedPlan ? (
          <Badge variant="secondary" className="text-[11px] font-normal gap-1">
            Saving to: {planDisplayName(selectedPlan)}
          </Badge>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Therapy plan
            </p>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select therapy plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id} className="text-xs">
                    {planDisplayName(plan)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {canSave ? (
          <SessionNotesForm
            key={formKey}
            defaultSessionType="TELEHEALTH"
            initialValues={initialValues}
            exercises={selectedPlan?.therapy_exercises ?? selectedPlan?.exercises ?? []}
            stickyFooter
            saving={saving}
            onSave={handleSave}
            onReset={() => setFormKey((k) => k + 1)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Session notes cannot be saved until an active therapy plan is linked.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
