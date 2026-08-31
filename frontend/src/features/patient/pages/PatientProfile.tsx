import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Lock, Plus, Upload, UserCog, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import PageHeader from "@/components/common/PageHeader";
import PortalAccountTypeBadge from "@/components/common/PortalAccountTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { usePatient } from "@/hooks/usePatients";
import { patientService } from "../services/patientService";
import LinkedFamilyMembersCard from "../components/LinkedFamilyMembersCard";
import api from "@/lib/api";
import RecoverySparkline from "../components/RecoverySparkline";
import { exportPatientCsv, exportPatientReport } from "../utils/exportPatient";
import type { AuditLogEntry, MedicalRecord, PatientDocument, TherapySession } from "../patient.types";

// ✅ FIX: null/invalid date crash fix
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  } catch {
    return "—";
  }
};

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patient, loading, error, setPatient } = usePatient(id);
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string }[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";
  const canWriteClinical = isDoctor;
  const canUploadDocuments = isAdmin || isDoctor;
  const canViewConfidential = isAdmin || isDoctor;
  const canViewAudit = isAdmin || isDoctor;
  const patientsListPath = isDoctor ? "/doctor/patients" : "/admin/patients";
  const actor = { name: user?.name ?? "User", role: (user?.role as "admin" | "doctor") ?? "doctor" };

  const refreshAuditAndDocs = async (patientId: string) => {
    const [auditResult, docResult] = await Promise.allSettled([
      patientService.getAuditLog(patientId),
      patientService.listPatientDocuments(patientId),
    ]);
    if (auditResult.status === "fulfilled") {
      setAudit(auditResult.value);
    }
    if (docResult.status === "fulfilled") {
      setDocuments(docResult.value);
    } else {
      toast.error(
        docResult.reason instanceof Error
          ? docResult.reason.message
          : "Failed to load documents.",
      );
    }
  };

  useEffect(() => {
    void patientService.listDoctors().then(setDoctors).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    void refreshAuditAndDocs(id);
  }, [id]);

  if (loading) {
    return (
      <>
        <p className="text-sm text-muted-foreground p-6">Loading patient...</p>
      </>
    );
  }

  if (error || !patient) {
    return (
      <>
        <p className="text-sm text-destructive p-6">{error ?? "Patient not found."}</p>
        <Button variant="outline" className="ml-6 mt-2" onClick={() => navigate(patientsListPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={patient.fullName ?? "Patient"}
        subtitle={`${patient.id} • ${patient.email ?? "—"} • ${patient.phone ?? "—"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(patientsListPath)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button variant="outline" onClick={() => exportPatientCsv(patient)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" onClick={() => exportPatientReport(patient)}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            {isAdmin ? (
              <Button asChild>
                <Link to={`/admin/patients/${patient.id}/edit`}>Edit demographics</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
            <CardDescription>Demographics and care assignment.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Info label="Gender" value={patient.gender ?? "—"} />
            <Info label="Date of birth" value={fmt(patient.dateOfBirth)} />
            <Info label="Address" value={patient.address ?? "—"} />
            <Info label="Status" value={<Badge>{patient.status ?? "—"}</Badge>} />
            <Info label="Admission" value={fmt(patient.admissionDate)} />
            <Info label="Primary diagnosis" value={
              <div className="flex flex-wrap items-center gap-2">
                <span>{patient.primaryDiagnosis ?? "—"}</span>
                {canWriteClinical ? (
                  <UpdateDiagnosisDialog
                    patientId={patient.id}
                    current={patient.primaryDiagnosis ?? ""}
                    onUpdated={(p) => {
                      setPatient(p);
                      void refreshAuditAndDocs(patient.id);
                    }}
                  />
                ) : null}
              </div>
            } />
            <Info label="Emergency contact" value={`${patient.emergencyContactName ?? "—"} • ${patient.emergencyContactPhone ?? "—"}`} />
            <Info label="Assigned doctor" value={patient.assignedDoctorName ?? "Unassigned"} />
            <Info
              label="Portal account type"
              value={<PortalAccountTypeBadge type={patient.portalAccountType ?? "patient"} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery</CardTitle>
            <CardDescription>Current progress: {patient.recoveryProgress ?? 0}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecoverySparkline data={patient.recoveryTimeline ?? []} />
            {canWriteClinical ? (
              <RecoveryUpdateDialog
                patientId={patient.id}
                onUpdated={(p) => {
                  setPatient(p);
                  void refreshAuditAndDocs(patient.id);
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canViewAudit ? (
        <LinkedFamilyMembersCard
          members={patient.linkedFamilyMembers ?? []}
          patientsListPath={patientsListPath}
        />
      ) : null}

      <Tabs defaultValue="history" className="mt-6">
        <TabsList>
          <TabsTrigger value="history">Medical history</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="therapy">Therapy sessions</TabsTrigger>
          <TabsTrigger value="telehealth">Telehealth notes</TabsTrigger>
          {isAdmin && <TabsTrigger value="assign">Assign doctor</TabsTrigger>}
          {canViewConfidential && <TabsTrigger value="confidential">Confidential</TabsTrigger>}
          {canViewAudit && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>

        {/* Medical History */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Medical history</CardTitle>
                <CardDescription>
                  Doctor-managed clinical history. {isAdmin ? "Admin: view only — ask the assigned doctor to add or update records." : "Create once, then update as care progresses."}
                </CardDescription>
              </div>
              {canWriteClinical ? (
                <AddRecordDialog
                  patientId={patient.id}
                  actor={actor}
                  onUpdated={(p) => {
                    setPatient(p);
                    void refreshAuditAndDocs(patient.id);
                  }}
                />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {(patient.medicalHistory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No records yet. Assigned doctor can add past diseases, allergies, and addiction history.</p>
              ) : (
                (patient.medicalHistory ?? []).map((m) => (
                  <RecordRow
                    key={m.id}
                    record={m}
                    canEdit={canWriteClinical}
                    patientId={patient.id}
                    onUpdated={(p) => {
                      setPatient(p);
                      void refreshAuditAndDocs(patient.id);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Medical documents</CardTitle>
                <CardDescription>
                  Lab reports, prescriptions, and assessment files.
                  {canUploadDocuments ? " Upload here — patient will see them in their Documents section." : ""}
                </CardDescription>
              </div>
              {canUploadDocuments ? (
                <UploadDocumentDialog
                  patientId={patient.id}
                  onUploaded={(uploaded) => {
                    if (uploaded) {
                      setDocuments((prev) => {
                        const key = `${uploaded.source}-${uploaded.id}`;
                        if (prev.some((d) => `${d.source}-${d.id}` === key)) return prev;
                        return [uploaded, ...prev];
                      });
                    }
                    void refreshAuditAndDocs(patient.id);
                  }}
                />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={`${doc.source}-${doc.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.category.replace(/_/g, " ")} · {doc.fileType} · {fmt(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{doc.source}</Badge>
                      {doc.source === "file" && doc.fileName ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void patientService
                              .openPatientDocumentFile(patient.id, doc.fileName!)
                              .catch((err) => {
                                toast.error(err instanceof Error ? err.message : "Could not open document.");
                              });
                          }}
                        >
                          Open
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Therapy Sessions */}
        <TabsContent value="therapy">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Therapy sessions</CardTitle>
                <CardDescription>
                  Doctor records session notes after each visit. Linked sessions appear on the patient Therapy Plan.
                  {isAdmin ? " Admin: view only." : ""}
                </CardDescription>
              </div>
              {canWriteClinical ? (
                <AddSessionDialog
                  patientId={patient.id}
                  onUpdated={(p) => {
                    setPatient(p);
                    void refreshAuditAndDocs(patient.id);
                  }}
                />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {(patient.therapySessions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions yet.</p>
              ) : (
                (patient.therapySessions ?? []).map((s) => <SessionRow key={s.id} session={s} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telehealth Notes */}
        <TabsContent value="telehealth">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Telehealth session notes</CardTitle>
              <CardDescription>
                Notes from completed online appointments. When saved and linked to a therapy plan, the patient sees them in Session History.
                {isAdmin ? " Admin: view only." : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelehealthNotesSection patientId={patient.id} canEdit={canWriteClinical} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assign Doctor */}
        {isAdmin && (
          <TabsContent value="assign">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign doctor</CardTitle>
                <CardDescription>
                  Currently: {patient.assignedDoctorName ?? "Unassigned"}. Only admin-approved doctors can be assigned.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No approved doctors available. Approve a doctor from the admin doctors list first.
                  </p>
                ) : (
                <AssignDoctor
                  doctors={doctors}
                  currentId={patient.assignedDoctorId}
                  disabled={!isAdmin}
                  onSelect={async (doctorId) => {
                    try {
                      const updated = await patientService.assignDoctor(patient.id, doctorId);
                      setPatient(updated);
                      toast.success("Doctor assigned.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to assign.");
                    }
                  }}
                />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Confidential Notes */}
        {canViewConfidential && (
          <TabsContent value="confidential">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Confidential notes
                  </CardTitle>
                  <CardDescription>
                    Sensitive rehab data (mental health, addiction severity). Visible to doctors and admins only — never shown to patient or family.
                    {isAdmin ? " Admin: view only — doctors add these notes." : ""}
                  </CardDescription>
                </div>
                {canWriteClinical ? (
                  <AddNoteDialog
                    patientId={patient.id}
                    actor={actor}
                    onUpdated={(p) => {
                      setPatient(p);
                      void refreshAuditAndDocs(patient.id);
                    }}
                  />
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {(patient.confidentialNotes ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No confidential notes.</p>
                ) : (
                  (patient.confidentialNotes ?? []).map((n) => (
                    <div key={n.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{n.authorName} · {n.authorRole}</span>
                        <span>{fmt(n.date)}</span>
                      </div>
                      <p className="mt-2 text-sm">{n.body}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Audit Log */}
        {canViewAudit && (
          <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit log</CardTitle>
              <CardDescription>
                Automatically maintained — who changed diagnosis, records, assignments, and when. Not visible to patients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries.</p>
              ) : (
                audit.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <p className="font-medium">{a.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.actorName} ({a.actorRole}) · {a.action}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
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

function RecordRow({
  record,
  canEdit,
  patientId,
  onUpdated,
}: {
  record: MedicalRecord;
  canEdit?: boolean;
  patientId?: string;
  onUpdated?: (p: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(record.type);
  const [title, setTitle] = useState(record.title);
  const [details, setDetails] = useState(record.details);

  const typeLabel = String(record.type).replace(/_/g, " ");

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{record.title}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{typeLabel}</Badge>
          {canEdit && patientId && onUpdated ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Record category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="past_disease">Past disease</SelectItem>
              <SelectItem value="allergies">Allergies</SelectItem>
              <SelectItem value="addiction">Addiction history</SelectItem>
              <SelectItem value="note">Clinical note</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Type 2 diabetes, Penicillin allergy"
          />
          <Textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Onset date, severity, treatment given, and current status..."
          />
          <Button
            size="sm"
            onClick={async () => {
              try {
                const updated = await patientService.updateMedicalRecord(patientId, record.id, {
                  type,
                  title,
                  details,
                });
                onUpdated(updated);
                setEditing(false);
                toast.success("Medical record updated.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update record.");
              }
            }}
          >
            Save changes
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{record.details}</p>
          <p className="mt-1 text-xs text-muted-foreground">{record.authorName} · {fmt(record.date)}</p>
        </>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: TherapySession }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="font-medium">{session.type} · {session.therapistName}</p>
        <p className="text-xs text-muted-foreground">{fmt(session.date)}</p>
        {session.notes ? <p className="text-sm mt-1">{session.notes}</p> : null}
      </div>
      <Badge>{session.status}</Badge>
    </div>
  );
}

// Telehealth Notes Component for Patient Profile
function TelehealthNotesSection({ patientId, canEdit }: { patientId: string; canEdit?: boolean }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments?patientId=${patientId}`)
      .then(res => {
        const items = res.data?.items || res.data || [];
        const telehealth = items
          .filter((a: any) => a.mode === "online" && (a.status === "COMPLETED" || a.status === "completed"))
          .slice(0, 5);
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
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No telehealth sessions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {appointments.map((apt) => (
        <TelehealthNoteItem
          key={apt.id}
          appointmentId={apt.id}
          date={apt.date}
          doctorName={apt.doctorName}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function TelehealthNoteItem({
  appointmentId,
  date,
  doctorName,
  canEdit,
}: {
  appointmentId: string;
  date: string;
  doctorName: string;
  canEdit?: boolean;
}) {
  const [notes, setNotes] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ rating: number | null; comment: string | null }>({ rating: null, comment: null });

  useEffect(() => {
    Promise.all([
      api.get(`/appointments/${appointmentId}/telehealth/notes`),
      api.get(`/appointments/${appointmentId}/feedback`),
    ])
      .then(([notesRes, feedbackRes]) => {
        const loaded = notesRes.data?.notes || "";
        setNotes(loaded);
        setDraftNotes(loaded);
        setFeedback({ rating: feedbackRes.data.rating, comment: feedbackRes.data.comment });
      })
      .catch(() => {
        setNotes("");
        setDraftNotes("");
        setFeedback({ rating: null, comment: null });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [appointmentId]);

  if (loading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Video className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{fmt(date)} · {doctorName}</span>
      </div>
      {canEdit ? (
        <div className="space-y-2">
          <Label>Session notes (discussion &amp; patient response)</Label>
          <Textarea
            rows={4}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Summarize topics discussed, patient mood and engagement, homework or next steps agreed in the call..."
          />
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api.put(`/appointments/${appointmentId}/telehealth/notes`, { notes: draftNotes });
                setNotes(draftNotes);
                toast.success("Telehealth notes saved.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to save notes.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save notes"}
          </Button>
        </div>
      ) : (
        <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
          {notes || "No notes for this session"}
        </div>
      )}
      {feedback.rating ? (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">Patient feedback</span>
          </div>
          <div className="flex items-center gap-1 mb-1">
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
            <p className="text-muted-foreground mt-1">{feedback.comment}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssignDoctor({
  doctors, currentId, disabled, onSelect,
}: {
  doctors: { id: string; name: string; specialty: string }[];
  currentId?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>(currentId || undefined);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[260px] flex-1">
        <Label>Doctor</Label>
        <Select value={value} onValueChange={setValue} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an approved doctor for this patient" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button disabled={disabled || !value} onClick={() => onSelect(value)}>
        <UserCog className="h-4 w-4 mr-1" /> Assign
      </Button>
    </div>
  );
}

function RecoveryUpdateDialog({ patientId, onUpdated }: { patientId: string; onUpdated: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(50);
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Update progress</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add recovery point</DialogTitle>
          <DialogDescription>Score 0–100.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Score: {score}</Label>
          <Slider value={[score]} max={100} step={1} onValueChange={(v) => setScore(v[0])} />
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional: why the score changed, milestones reached, or setbacks observed..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            try {
              const updated = await patientService.addRecoveryPoint(patientId, score, note || undefined);
              onUpdated(updated);
              setOpen(false);
              toast.success("Recovery point added.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed.");
            }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRecordDialog({
  patientId, actor, onUpdated,
}: { patientId: string; actor: { name: string; role: "admin" | "doctor" }; onUpdated: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MedicalRecord["type"]>("past_disease");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add record</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add medical history</DialogTitle>
          <DialogDescription>Past diseases, allergies, and addiction history are recorded once and updated over time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={type} onValueChange={(v) => setType(v as MedicalRecord["type"])}>
              <SelectTrigger><SelectValue placeholder="Choose record type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="past_disease">Past disease</SelectItem>
                <SelectItem value="allergies">Allergies</SelectItem>
                <SelectItem value="addiction">Addiction history</SelectItem>
                <SelectItem value="note">Other clinical note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short label, e.g. Hypertension, Latex allergy"
            />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Clinical details: when diagnosed, medications, reactions, relapse history..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!title.trim()} onClick={async () => {
            try {
              const updated = await patientService.addMedicalRecord(patientId, {
                type,
                title,
                details,
                date: new Date().toISOString(),
                authorName: actor.name,
              });
              onUpdated(updated);
              setTitle(""); setDetails("");
              setOpen(false);
              toast.success("Record added.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed.");
            }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSessionDialog({ patientId, onUpdated }: { patientId: string; onUpdated: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("CBT");
  const [therapistName, setTherapistName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<TherapySession["status"]>("scheduled");
  const [notes, setNotes] = useState("");
  const [behavior, setBehavior] = useState("");
  const [progress, setProgress] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record therapy session</DialogTitle>
          <DialogDescription>Document session notes, patient behavior, and progress after the visit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label>Session type</Label>
              <Input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. CBT, Physiotherapy, Group therapy"
              />
            </div>
          </div>
          <div>
            <Label>Therapist name</Label>
            <Input
              value={therapistName}
              onChange={(e) => setTherapistName(e.target.value)}
              placeholder="Full name of the therapist who ran this session"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TherapySession["status"])}>
              <SelectTrigger><SelectValue placeholder="Session outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Session notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was covered in the session, interventions used, homework assigned..."
            />
          </div>
          <div>
            <Label>Patient behavior</Label>
            <Input
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder="Engagement, mood, cooperation during the session"
            />
          </div>
          <div>
            <Label>Progress</Label>
            <Input
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              placeholder="Goals achieved, improvements, or areas still needing work"
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!therapistName.trim()} onClick={async () => {
            try {
              const updated = await patientService.addTherapySession(patientId, {
                date: new Date(date).toISOString(), type, therapistName, status, notes,
                behavior, progress,
              });
              onUpdated(updated);
              setOpen(false);
              toast.success("Session recorded.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed.");
            }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddNoteDialog({
  patientId, actor, onUpdated,
}: { patientId: string; actor: { name: string; role: "admin" | "doctor" }; onUpdated: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add note</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add confidential note</DialogTitle>
          <DialogDescription>Sensitive clinical information — not visible to patient or family accounts.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Sensitive observations only: risk level, relapse signs, mental state, safeguarding concerns. Not shown to patient or family."
        />
        <DialogFooter>
          <Button disabled={!body.trim()} onClick={async () => {
            try {
              const updated = await patientService.addConfidentialNote(patientId, body, actor);
              onUpdated(updated);
              setBody("");
              setOpen(false);
              toast.success("Note added.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed.");
            }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateDiagnosisDialog({
  patientId,
  current,
  onUpdated,
}: {
  patientId: string;
  current: string;
  onUpdated: (p: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState(current);
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setDiagnosis(current); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Update</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update diagnosis</DialogTitle>
          <DialogDescription>Primary diagnosis for this patient.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Input
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Post-stroke rehabilitation"
          />
        </div>
        <DialogFooter>
          <Button
            disabled={!diagnosis.trim()}
            onClick={async () => {
              try {
                const updated = await patientService.updateDiagnosis(patientId, diagnosis.trim());
                onUpdated(updated);
                setOpen(false);
                toast.success("Diagnosis updated.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed.");
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDocumentDialog({
  patientId,
  onUploaded,
}: {
  patientId: string;
  onUploaded: (uploaded?: PatientDocument) => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PatientDocument["category"]>("medical_report");
  const [uploading, setUploading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload medical document</DialogTitle>
          <DialogDescription>Lab reports, prescriptions, or assessment files (max 15 MB).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood test results — March 2026"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PatientDocument["category"])}>
              <SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_result">Lab result</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="therapy_assessment">Assessment report</SelectItem>
                <SelectItem value="medical_report">Medical report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!file || uploading}
            onClick={async () => {
              if (!file) return;
              setUploading(true);
              try {
                const result = await patientService.uploadDocument(patientId, file, {
                  title: title.trim() || file.name,
                  category,
                });
                if (result?.item) {
                  onUploaded(result.item);
                } else {
                  onUploaded();
                }
                setFile(null);
                setTitle("");
                setOpen(false);
                toast.success("Document uploaded.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setUploading(false);
              }
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}