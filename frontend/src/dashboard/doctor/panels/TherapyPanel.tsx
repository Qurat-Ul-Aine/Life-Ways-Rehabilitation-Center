import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, BookOpen, FileVideo, FileText, ImageIcon, Eye, Trash2, Loader2, Upload, StickyNote, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { therapyService } from "@/features/therapy/services/therapyService";
import SessionNotesForm, { type SessionNotesFormValues } from "@/features/therapy/components/SessionNotesForm";
import SessionNotesHistory from "@/features/therapy/components/SessionNotesHistory";
import PrescribedExercisesPanel from "@/features/therapy/components/PrescribedExercisesPanel";
import { getTherapyPermissions } from "@/features/therapy/utils/therapyPermissions";
import type { TherapyFile, TherapyPlan } from "@/features/therapy/therapy.types";
import { cn } from "@/lib/utils";
import { DoctorPanelAccordion, doctorPanelBody, doctorPanelHint, doctorPanelLabel } from "../components/DoctorPanelAccordion";

const DOCTOR_THERAPY_BASE = "/doctor/therapy";

const ACTIVE_SESSION_STATUSES = new Set([
  "in_progress",
  "Now",
  "Pending",
  "pending",
  "scheduled",
  "SCHEDULED",
  "Next",
  "BOOKED",
]);

const progressColor = (pct: number) => {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
};

const statusVariant = (
  score: number,
): "default" | "secondary" | "outline" | "destructive" => {
  if (score >= 70) return "default";
  if (score >= 40) return "outline";
  if (score < 25) return "destructive";
  return "secondary";
};

const statusLabel = (score: number) => {
  if (score >= 70) return "Active";
  if (score >= 40) return "Early";
  if (score < 25) return "Critical";
  return "Active";
};

const isActivePlan = (plan: TherapyPlan) => {
  const s = String(plan.status ?? "ACTIVE").toUpperCase();
  return s === "ACTIVE";
};

const getPlanPatientId = (plan: TherapyPlan) =>
  plan.patient_id ?? plan.patientId ?? "";

const getPatientName = (plan: TherapyPlan) =>
  plan.patients?.users?.name ?? plan.patientName ?? "Patient";

const getPlanCondition = (plan: TherapyPlan) =>
  plan.therapy_type ?? plan.title ?? plan.diagnosis ?? "—";

const sessionStats = (plan: TherapyPlan) => {
  const sessions = plan.therapy_sessions ?? [];
  const total = sessions.length;
  const completed = sessions.filter((s) => {
    const st = String(s.status ?? "").toUpperCase();
    return st === "COMPLETED";
  }).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
};

const formatFileDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const fileTypeMeta = (fileType: TherapyFile["fileType"]) => {
  if (fileType === "video") {
    return { Icon: FileVideo, label: "Video", chip: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" };
  }
  if (fileType === "image") {
    return { Icon: ImageIcon, label: "Image", chip: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" };
  }
  return { Icon: FileText, label: "Document", chip: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
};

const TherapyPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const therapyPerms = getTherapyPermissions(user?.role ?? "doctor");
  const { data, loading, error, refetch } = useDoctorDashboard();

  const schedule = data?.todaySchedule ?? [];
  const patients = data?.patients ?? data?.patientRecovery ?? [];

  const [plans, setPlans] = useState<TherapyPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [savingSessionNotes, setSavingSessionNotes] = useState(false);
  const [sessionNotesKey, setSessionNotesKey] = useState(0);
  const [showNewSessionForm, setShowNewSessionForm] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadPlanId, setUploadPlanId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<TherapyFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const items = await therapyService.listPlans();
      setPlans(items.filter(isActivePlan));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load therapy plans.");
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const activeSession = useMemo(() => {
    const live = schedule.find((s) => ACTIVE_SESSION_STATUSES.has(s.status));
    return live ?? schedule[0] ?? null;
  }, [schedule]);

  const activeAppointmentForPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    const patientSlots = schedule.filter(
      (s) => s.patientId === selectedPatientId && s.status !== "Done",
    );
    if (patientSlots.length === 0) return null;
    return patientSlots.find((s) => s.status === "Now") ?? patientSlots[0];
  }, [schedule, selectedPatientId]);

  useEffect(() => {
    if (activeSession?.patientId) {
      setSelectedPatientId(activeSession.patientId);
    } else if (!selectedPatientId && plans.length > 0) {
      setSelectedPatientId(getPlanPatientId(plans[0]));
    }
  }, [activeSession, plans, selectedPatientId]);

  const tableLoading = loading || plansLoading;

  const findPlanForPatient = useCallback(
    (patientId: string) => plans.find((p) => getPlanPatientId(p) === patientId),
    [plans],
  );

  useEffect(() => {
    if (!selectedPatientId) return;
    const plan = findPlanForPatient(selectedPatientId);
    if (plan) setUploadPlanId(plan.id);
  }, [selectedPatientId, findPlanForPatient]);

  const activePatientPlan = useMemo(
    () => (selectedPatientId ? findPlanForPatient(selectedPatientId) : null),
    [selectedPatientId, findPlanForPatient],
  );

  const patientSessions = activePatientPlan?.therapy_sessions ?? [];
  const patientExercises =
    activePatientPlan?.therapy_exercises ?? activePatientPlan?.exercises ?? [];

  useEffect(() => {
    if (patientSessions.length > 0) setShowNewSessionForm(false);
  }, [selectedPatientId, patientSessions.length]);

  const refreshPatientPlan = useCallback(async () => {
    await loadPlans();
    refetch();
  }, [loadPlans, refetch]);

  const handleExport = () => {
    if (plans.length === 0) return toast.error("No data to export.");
    const rows = [
      ["Patient", "Program", "Sessions", "Progress %", "Status"],
      ...plans.map((plan) => {
        const { total, pct } = sessionStats(plan);
        return [
          getPatientName(plan),
          getPlanCondition(plan),
          String(total),
          String(pct),
          statusLabel(pct),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "therapy-plans.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully.");
  };

  const handleSaveSessionNotes = async (values: SessionNotesFormValues) => {
    if (!selectedPatientId) return toast.error("Select a patient first.");

    const activePlan = findPlanForPatient(selectedPatientId);
    if (!activePlan) {
      return toast.error("No active therapy plan found for this patient.");
    }

    setSavingSessionNotes(true);
    try {
      await therapyService.recordSession({
        planId: activePlan.id,
        appointmentId: activeAppointmentForPatient?.id,
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

      toast.success("Session notes saved — patient can view them on Therapy Plan.");
      setSessionNotesKey((k) => k + 1);
      setShowNewSessionForm(false);
      await refreshPatientPlan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingSessionNotes(false);
    }
  };

  const resolveUploadPlan = useCallback((): TherapyPlan | null => {
    if (selectedPatientId) {
      const patientPlan = findPlanForPatient(selectedPatientId);
      if (patientPlan) return patientPlan;
    }
    if (uploadPlanId) {
      return plans.find((plan) => plan.id === uploadPlanId) ?? null;
    }
    if (plans.length === 1) return plans[0];
    return null;
  }, [selectedPatientId, findPlanForPatient, uploadPlanId, plans]);

  const activeUploadPlan = useMemo(() => resolveUploadPlan(), [resolveUploadPlan]);

  const loadUploadedFiles = useCallback(async () => {
    const plan = resolveUploadPlan();
    if (!plan) {
      setUploadedFiles([]);
      return;
    }
    setFilesLoading(true);
    try {
      const items = await therapyService.listFiles(plan.id);
      setUploadedFiles(items);
    } catch {
      setUploadedFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [resolveUploadPlan]);

  useEffect(() => {
    void loadUploadedFiles();
  }, [loadUploadedFiles, plans, selectedPatientId, uploadPlanId]);

  const uploadToPlan = async (planId: string, file: File) => {
    const uploadedBy = user?.name ?? "Doctor";
    setUploadingFile(true);
    try {
      await therapyService.uploadFile(planId, file, {
        uploadedBy,
        title: file.name,
      });
      toast.success(`"${file.name}" uploaded successfully.`);
      setPendingFile(null);
      await Promise.all([loadPlans(), loadUploadedFiles()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingFile(false);
    }
  };

  const processFile = async (file: File) => {
    if (plans.length === 0) {
      toast.error("No active therapy plans to attach this file to.");
      return;
    }

    const targetPlan = resolveUploadPlan();
    if (targetPlan) {
      await uploadToPlan(targetPlan.id, file);
      return;
    }

    setPendingFile(file);
    toast.info("Select the patient's therapy plan to attach this file.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleUploadPlanConfirm = async () => {
    if (!pendingFile || !uploadPlanId) {
      toast.error("Select a therapy plan first.");
      return;
    }
    await uploadToPlan(uploadPlanId, pendingFile);
  };

  const handleViewFile = (file: TherapyFile) => {
    const plan = resolveUploadPlan();
    if (!plan) return;
    void therapyService.openFile(plan.id, file).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not open file.");
    });
  };

  const handleDeleteFile = async (fileId: string) => {
    const plan = resolveUploadPlan();
    if (!plan) return;
    setDeletingFileId(fileId);
    try {
      await therapyService.deleteFile(plan.id, fileId);
      toast.success("File removed.");
      await Promise.all([loadUploadedFiles(), loadPlans()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingFileId(null);
    }
  };

  const selectedPatientLabel = useMemo(() => {
    if (activeSession) {
      return `${activeSession.patientName} — ${activeSession.condition}`;
    }
    const plan = findPlanForPatient(selectedPatientId);
    if (plan) return `${getPatientName(plan)} — ${getPlanCondition(plan)}`;
    const patient = patients.find((p) => p.id === selectedPatientId);
    if (patient) return patient.name;
    return "Select a patient";
  }, [activeSession, selectedPatientId, findPlanForPatient, patients]);

  const patientOptions = useMemo(() => {
    const fromPlans = plans.map((plan) => ({
      id: getPlanPatientId(plan),
      name: getPatientName(plan),
    }));
    const seen = new Set<string>();
    return fromPlans.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [plans]);

  return (
    <div className="space-y-5 pb-2">
      {/* Active therapy plans */}
      <DoctorPanelAccordion
        title="Active therapy plans"
        description="All patients currently on an active rehabilitation program"
        badge={plans.length}
        icon={<BookOpen size={18} aria-hidden />}
        defaultOpen
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={handleExport}
            disabled={plans.length === 0}
          >
            <Download size={15} aria-hidden />
            Export list
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={() => navigate(`${DOCTOR_THERAPY_BASE}/new`)}
          >
            <Plus size={15} aria-hidden />
            New plan
          </Button>
        </div>

        {tableLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <p className={cn(doctorPanelBody, "text-destructive")}>{error}</p>
        ) : plans.length === 0 ? (
          <p className={doctorPanelHint}>
            No therapy plans found.{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => navigate(`${DOCTOR_THERAPY_BASE}/new`)}
            >
              Create one
            </button>
          </p>
        ) : (
          <ul className="space-y-3">
            {plans.map((plan) => {
              const { total, pct } = sessionStats(plan);
              return (
                <li
                  key={plan.id}
                  className="rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/25"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-heading text-base font-semibold text-foreground">
                        {getPatientName(plan)}
                      </p>
                      <p className={doctorPanelHint}>{getPlanCondition(plan)}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{total}</span> sessions recorded
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-[140px]">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className={doctorPanelLabel}>Progress</span>
                          <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", progressColor(pct))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant={statusVariant(pct)} className="h-7 w-fit px-2.5 text-xs">
                        {statusLabel(pct)}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-sm"
                          onClick={() => navigate(`${DOCTOR_THERAPY_BASE}/${plan.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 text-sm"
                          onClick={() => navigate(`${DOCTOR_THERAPY_BASE}/${plan.id}/edit`)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DoctorPanelAccordion>

      {/* Patient workspace */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/60 bg-gradient-to-r from-primary/8 via-background to-emerald-500/5 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={doctorPanelLabel}>Patient workspace</p>
              <p className="mt-1 truncate font-heading text-lg font-semibold text-foreground">
                {selectedPatientLabel}
              </p>
              <p className={cn(doctorPanelHint, "mt-1")}>
                Record session notes, prescribe exercises, and upload materials for this patient.
              </p>
            </div>
            {patientOptions.length > 1 && (
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="h-10 w-full bg-background text-sm sm:w-[240px]">
                  <SelectValue placeholder="Switch patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {!selectedPatientId || !activePatientPlan ? (
          <div className="px-5 py-12 text-center">
            <p className={doctorPanelBody}>Select a patient with an active therapy plan to continue.</p>
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            <DoctorPanelAccordion
              title="Session notes"
              description="Saved notes appear on the patient's Therapy Plan page"
              badge={patientSessions.length}
              icon={<StickyNote size={18} aria-hidden />}
              defaultOpen
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className={doctorPanelHint}>
                  Document what happened in today's session — progress, exercises, and follow-up.
                </p>
                {therapyPerms.canAddSessionNotes && (
                  <Button
                    type="button"
                    variant={showNewSessionForm ? "secondary" : "outline"}
                    size="sm"
                    className="h-9 gap-1.5 text-sm"
                    onClick={() => setShowNewSessionForm((v) => !v)}
                  >
                    {showNewSessionForm ? <ChevronUp size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                    {showNewSessionForm ? "Hide new session form" : "Add new session"}
                  </Button>
                )}
              </div>

              {therapyPerms.canAddSessionNotes && showNewSessionForm && (
                <div className="mb-5 rounded-xl border border-primary/20 bg-background p-4">
                  <SessionNotesForm
                    key={`${selectedPatientId}-${sessionNotesKey}`}
                    defaultSessionType="IN_PERSON"
                    exercises={patientExercises}
                    saving={savingSessionNotes}
                    onSave={handleSaveSessionNotes}
                    onReset={() => setSessionNotesKey((k) => k + 1)}
                  />
                </div>
              )}

              <SessionNotesHistory
                planId={activePatientPlan.id}
                sessions={patientSessions}
                therapist={user?.name ?? "You"}
                showConfidential={therapyPerms.canViewConfidentialNotes}
                canEdit={therapyPerms.canEditSessionNotes}
                canDelete={therapyPerms.canDeleteSessionNotes}
                onUpdated={() => void refreshPatientPlan()}
              />
            </DoctorPanelAccordion>

            <DoctorPanelAccordion
              title="Prescribed exercises"
              description="Text-based exercises shown on the patient therapy plan"
              badge={patientExercises.length}
              icon={<BookOpen size={18} aria-hidden />}
            >
              <PrescribedExercisesPanel
                planId={activePatientPlan.id}
                exercises={patientExercises}
                canManage={therapyPerms.canManageExercises}
                onChanged={() => void refreshPatientPlan()}
              />
            </DoctorPanelAccordion>

            <DoctorPanelAccordion
              title="Exercise files"
              description="Videos, PDFs, worksheets and guides for the patient"
              badge={uploadedFiles.length}
              icon={<Upload size={18} aria-hidden />}
            >
              {pendingFile && (
                <div className="mb-4 space-y-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20">
                  <p className={doctorPanelBody}>
                    Ready to upload <span className="font-semibold">{pendingFile.name}</span>
                  </p>
                  {patientOptions.length > 1 && (
                    <Select value={uploadPlanId} onValueChange={setUploadPlanId}>
                      <SelectTrigger className="h-10 bg-background text-sm">
                        <SelectValue placeholder="Select therapy plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id} className="text-sm">
                            {getPatientName(plan)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full text-sm"
                    disabled={uploadingFile || !uploadPlanId}
                    onClick={() => void handleUploadPlanConfirm()}
                  >
                    {uploadingFile ? (
                      <Loader2 size={15} className="mr-1.5 animate-spin" aria-hidden />
                    ) : (
                      <Upload size={15} className="mr-1.5" aria-hidden />
                    )}
                    Attach to plan
                  </Button>
                </div>
              )}

              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  uploadingFile
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/20",
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  {uploadingFile ? (
                    <Loader2 size={22} className="animate-spin text-primary" aria-hidden />
                  ) : (
                    <Upload size={22} className="text-muted-foreground" aria-hidden />
                  )}
                </div>
                <p className={cn(doctorPanelBody, "font-medium")}>
                  {uploadingFile ? "Uploading file…" : "Drag and drop a file here"}
                </p>
                <p className={cn(doctorPanelHint, "mt-1")}>Videos, images, PDFs, and audio supported</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-9 gap-1.5 text-sm"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <BookOpen size={15} aria-hidden />
                  Browse files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*,.pdf,.doc,.docx,audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
              </div>

              {filesLoading ? (
                <div className="mt-4 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : uploadedFiles.length === 0 ? (
                <p className={cn(doctorPanelHint, "mt-4 text-center py-4")}>No files uploaded yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => {
                    const meta = fileTypeMeta(file.fileType);
                    const Icon = meta.Icon;
                    return (
                      <li
                        key={file.id}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
                      >
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", meta.chip)}>
                          <Icon size={18} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {file.title ?? file.fileName}
                          </p>
                          <p className="text-sm text-muted-foreground">{formatFileDate(file.uploadedAt)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => handleViewFile(file)}
                          aria-label="View file"
                        >
                          <Eye size={16} aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-destructive"
                          disabled={deletingFileId === file.id}
                          onClick={() => void handleDeleteFile(file.id)}
                          aria-label="Delete file"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 size={16} className="animate-spin" aria-hidden />
                          ) : (
                            <Trash2 size={16} aria-hidden />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DoctorPanelAccordion>
          </div>
        )}
      </section>
    </div>
  );
};

export default TherapyPanel;
