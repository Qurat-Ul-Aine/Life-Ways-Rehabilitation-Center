import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  HeartPulse,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PatientSessionHistory from "@/features/therapy/components/PatientSessionHistory";
import { parseLegacyProgressNotes } from "@/features/therapy/utils/patientSessionDisplay";
import type { TherapyExercise, TherapyPlan, TherapySessionRecord } from "@/features/therapy/therapy.types";
import { patientService } from "@/features/patient/services/patientService";
import type { MedicalRecord } from "@/features/patient/patient.types";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import type { Appointment } from "@/features/appointment/appointment.types";
import api from "@/lib/api";
import { usePatientDocuments } from "@/features/patient/hooks/usePatientDocuments";
import RecoveryPanelCard from "./RecoveryPanelCard";
import RecoveryEmptyState from "./RecoveryEmptyState";
import { RecoveryDocumentsContent } from "./RecoveryDocumentsSection";
import type { PatientProfile } from "../../hooks/usePatientContext";

const PATIENT_VISIBLE_HISTORY_TYPES = new Set(["past_disease", "allergies"]);

const formatShortDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(`${String(raw).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const isCompleted = (status?: string) =>
  String(status ?? "").toLowerCase() === "completed";

function MedicalHistoryTab({
  profile,
  loading,
}: {
  profile: PatientProfile | null;
  loading: boolean;
}) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    patientService
      .getMe()
      .then((me) => {
        if (!cancelled) {
          setRecords(me.medicalHistory ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRecords = useMemo(
    () =>
      records.filter((r) =>
        PATIENT_VISIBLE_HISTORY_TYPES.has(String(r.type ?? "").toLowerCase()),
      ),
    [records],
  );

  const diagnosis =
    profile?.condition?.trim() ||
    null;

  if (loading || fetching) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  const hasContent = Boolean(diagnosis) || visibleRecords.length > 0 || profile?.allergies?.trim();

  if (!hasContent) {
    return (
      <RecoveryEmptyState message="No medical history shared with you yet. Your care team will add diagnosis and past conditions here." />
    );
  }

  return (
    <div className="space-y-4">
      {diagnosis ? (
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Primary diagnosis
          </p>
          <p className="text-sm font-medium text-foreground">{diagnosis}</p>
        </div>
      ) : null}

      {profile?.allergies?.trim() ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Allergies
          </p>
          <p className="text-sm text-foreground">{profile.allergies.trim()}</p>
        </div>
      ) : null}

      {visibleRecords.length > 0 ? (
        <ul className="space-y-3" aria-label="Past conditions">
          {visibleRecords.map((record) => (
            <li key={record.id} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <p className="text-sm font-semibold text-foreground">{record.title}</p>
                <Badge variant="outline" className="text-[10px] font-normal capitalize">
                  {String(record.type).replace(/_/g, " ")}
                </Badge>
              </div>
              {record.details ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{record.details}</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-2">
                {formatShortDate(record.date)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TherapySessionsTab({
  plans,
  loading,
  fallbackTherapistName,
}: {
  plans: TherapyPlan[];
  loading: boolean;
  fallbackTherapistName?: string | null;
}) {
  const { sessions, exercises, therapist } = useMemo(() => {
    const allSessions: TherapySessionRecord[] = [];
    const allExercises: TherapyExercise[] = [];
    let therapistName: string | null = fallbackTherapistName?.trim() || null;

    for (const plan of plans) {
      const planSessions = plan.therapy_sessions ?? [];
      allSessions.push(...planSessions);
      allExercises.push(...(plan.therapy_exercises ?? plan.exercises ?? []));

      if (!therapistName) {
        therapistName =
          plan.doctors?.users?.name?.trim() ??
          plan.therapistName?.trim() ??
          plan.doctorName?.trim() ??
          null;
      }
    }

    return { sessions: allSessions, exercises: allExercises, therapist: therapistName };
  }, [plans, fallbackTherapistName]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <PatientSessionHistory
      sessions={sessions}
      exercises={exercises}
      therapist={therapist ?? undefined}
    />
  );
}

function TelehealthNotesTab({ patientId }: { patientId: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    appointmentService
      .list({ patientId })
      .then(async (items) => {
        if (cancelled) return;
        const telehealth = items.filter(
          (a) => a.mode === "online" && isCompleted(a.status),
        );
        setAppointments(telehealth);

        const entries = await Promise.all(
          telehealth.map(async (apt) => {
            try {
              const res = await api.get<{ notes?: string }>(
                `/appointments/${apt.id}/telehealth/notes`,
              );
              return [apt.id, res.data?.notes ?? ""] as const;
            } catch {
              return [apt.id, ""] as const;
            }
          }),
        );

        if (!cancelled) {
          setNotesById(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppointments([]);
          setNotesById({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <RecoveryEmptyState message="No completed telehealth sessions yet. Summaries will appear here after your online appointments." />
    );
  }

  return (
    <ul className="space-y-4" aria-label="Telehealth session notes">
      {appointments.map((apt) => {
        const raw = notesById[apt.id] ?? "";
        const parsed = parseLegacyProgressNotes(raw);
        const summary = parsed.summary.trim() || raw.trim();
        const recommendations = (parsed.nextSteps ?? "").trim();

        return (
          <li key={apt.id} className="rounded-xl border border-border/70 bg-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-3">
              <Video size={16} className="text-primary shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-foreground">
                {formatShortDate(apt.date)}
                {apt.doctorName ? ` · ${apt.doctorName}` : ""}
              </p>
            </header>
            <div className="space-y-3 px-4 py-4">
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Session summary
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {summary || "Your care team has not posted a summary for this visit yet."}
                </p>
              </section>
              {recommendations ? (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Recommendations
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {recommendations}
                  </p>
                </section>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  profile: PatientProfile | null;
  patientId: string | null;
  plans: TherapyPlan[];
  loadingPlans: boolean;
  profileLoading: boolean;
};

export default function RecoveryCareRecordsSection({
  profile,
  patientId,
  plans,
  loadingPlans,
  profileLoading,
}: Props) {
  const { documents, loading: docsLoading, error: docsError } = usePatientDocuments();

  return (
    <RecoveryPanelCard
      title="My care records"
      description="Your diagnosis, medical reports, therapy progress, and telehealth summaries — shared by your care team."
    >
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="history" className="text-xs sm:text-sm gap-1.5">
            <HeartPulse size={14} aria-hidden />
            Medical history
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm gap-1.5">
            <FileText size={14} aria-hidden />
            Reports
          </TabsTrigger>
          <TabsTrigger value="therapy" className="text-xs sm:text-sm gap-1.5">
            <BookOpen size={14} aria-hidden />
            Therapy sessions
          </TabsTrigger>
          <TabsTrigger value="telehealth" className="text-xs sm:text-sm gap-1.5">
            <Video size={14} aria-hidden />
            Telehealth notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-0">
          <MedicalHistoryTab profile={profile} loading={profileLoading} />
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <RecoveryDocumentsContent
            documents={documents}
            loading={docsLoading}
            error={docsError}
          />
        </TabsContent>

        <TabsContent value="therapy" className="mt-0">
          <TherapySessionsTab
            plans={plans}
            loading={loadingPlans || profileLoading}
            fallbackTherapistName={profile?.assignedDoctorName}
          />
        </TabsContent>

        <TabsContent value="telehealth" className="mt-0">
          <TelehealthNotesTab patientId={patientId} />
        </TabsContent>
      </Tabs>
    </RecoveryPanelCard>
  );
}
