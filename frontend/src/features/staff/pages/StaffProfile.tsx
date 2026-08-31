import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, ClipboardList, FileText, Plus, StickyNote, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useStaffMember } from "../hooks/useStaff";
import { staffService } from "../services/staffService";
import { formatShiftTimingDisplay } from "../utils/shiftTiming";
import { exportStaffReport } from "../utils/exportStaff";
import {
  normalizeStaffRole,
  staffRoleLabel,
  type AttendanceRecord,
  type AttendanceStatus,
  type StaffDocument,
  type StaffDocumentCategory,
  type StaffMember,
  type StaffNoteRecord,
  type StaffTaskRecord,
  type TaskStatus,
} from "../staff.types";

const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const shiftLabel = (type?: string | null) => {
  if (!type) return "—";
  const t = type.toLowerCase();
  if (t === "morning") return "Morning";
  if (t === "evening") return "Evening";
  return type;
};

export default function StaffProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member: raw, loading, error, setMember, refetch } = useStaffMember(id);

  const member: StaffMember | null = raw
    ? {
        ...raw,
        attendance: raw.attendance ?? [],
        attendanceSummary: raw.attendanceSummary ?? {
          presentDays: 0,
          totalDays: 0,
          percentage: 0,
        },
        taskSummary: raw.taskSummary ?? {
          total: 0,
          completed: 0,
          pending: 0,
          completedValue: "—",
          completedHint: "No tasks yet",
          pendingValue: "—",
          pendingHint: "No pending tasks",
        },
        tenureSummary: raw.tenureSummary ?? {
          displayValue: "—",
          subtitle: "Join date not set",
          joinedDate: null,
          months: 0,
        },
        tasks: raw.tasks ?? [],
        notes: raw.notes ?? [],
        documents: raw.documents ?? [],
        baseSalary: raw.baseSalary ?? 0,
        currency: raw.currency ?? "PKR",
        qualifications: raw.qualifications ?? raw.position ?? "",
        specialty: raw.specialty ?? raw.department ?? "",
        department: raw.department ?? raw.specialty ?? "",
        status: raw.status ?? "active",
        joinedOn: raw.joinedAt ?? raw.joinedOn ?? "",
        role: normalizeStaffRole(raw.role),
      }
    : null;

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading staff member...</p>;
  }

  if (error || !member) {
    return (
      <>
        <p className="p-6 text-sm text-destructive">{error ?? "Staff member not found."}</p>
        <Button variant="outline" className="ml-6 mt-2" onClick={() => navigate("/admin/staff")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </>
    );
  }

  const roleLabel = staffRoleLabel(member.role);
  const department = member.department || member.specialty || "—";
  const { presentDays, totalDays, percentage } = member.attendanceSummary!;
  const taskSummary = member.taskSummary!;
  const tenureSummary = member.tenureSummary!;

  return (
    <>
      <PageHeader
        title={member.fullName ?? member.name ?? "Staff Member"}
        subtitle={`${roleLabel} • ${department}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/staff")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={() => exportStaffReport(member)}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button asChild>
              <Link to={`/admin/staff/${member.id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Attendance"
          value={totalDays === 0 ? "—" : `${percentage}%`}
          hint={totalDays > 0 ? `${presentDays}/${totalDays} present days` : "No records yet"}
        />
        <Stat
          label="Tasks Completed"
          value={taskSummary.completedValue}
          hint={taskSummary.completedHint}
        />
        <Stat
          label="Pending Tasks"
          value={taskSummary.pendingValue}
          hint={taskSummary.pendingHint}
          valueClassName={
            taskSummary.pending > 0 ? "text-amber-500 dark:text-amber-400" : undefined
          }
        />
        <Stat
          label="Tenure"
          value={tenureSummary.displayValue}
          hint={tenureSummary.subtitle}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Details</CardTitle>
                <CardDescription>Contact and HR information.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Email" value={member.email} />
                <Info label="Phone" value={member.phone || "—"} />
                <Info label="Role" value={roleLabel} />
                <Info label="Department" value={department} />
                <Info label="Position" value={member.position || member.qualifications || "—"} />
                <Info
                  label="Joined On"
                  value={
                    member.joinedAt || member.joinedOn
                      ? new Date(member.joinedAt ?? member.joinedOn!).toLocaleDateString()
                      : "—"
                  }
                />
                <Info label="Status" value={<Badge>{member.status}</Badge>} />
                <Info
                  label="Base Salary"
                  value={`${member.currency} ${Number(member.baseSalary).toLocaleString()}`}
                />
              </CardContent>
            </Card>

            {(member.shiftType || member.shiftTiming) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shift Info</CardTitle>
                  <CardDescription>Work schedule for this staff member.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                  <Info label="Shift Type" value={shiftLabel(member.shiftType)} />
                  <Info label="Shift Timing" value={formatShiftTimingDisplay(member.shiftTiming)} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab
            staffId={member.id}
            records={member.attendance ?? []}
            onUpdated={setMember}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab staffId={member.id} tasks={member.tasks ?? []} onUpdated={setMember} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab staffId={member.id} notes={member.notes ?? []} onUpdated={setMember} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            staffId={member.id}
            documents={member.documents ?? []}
            onUpdated={(staff) => {
              setMember(staff);
              void refetch();
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AttendanceTab({
  staffId,
  records,
  onUpdated,
}: {
  staffId: string;
  records: AttendanceRecord[];
  onUpdated: (m: StaffMember) => void;
}) {
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await staffService.addAttendance(staffId, {
        date,
        status,
        checkIn: checkIn.trim() || undefined,
        checkOut: checkOut.trim() || undefined,
      });
      onUpdated(updated);
      toast.success("Attendance saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-5 w-5" />
            Mark Attendance
          </CardTitle>
          <CardDescription>Admin manually records attendance for this staff member.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="att-date">Date</Label>
            <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-in">Check-in (optional)</Label>
            <Input id="att-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-out">Check-out (optional)</Label>
            <Input id="att-out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => void handleSave()} disabled={saving || !date}>
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
          <CardDescription>{records.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Check-in</th>
                    <th className="py-2">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{fmtDate(a.date)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={a.status === "present" ? "default" : "outline"}>
                          {a.status === "present" ? "Present" : "Absent"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{a.checkIn || "—"}</td>
                      <td className="py-2">{a.checkOut || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TasksTab({
  staffId,
  tasks,
  onUpdated,
}: {
  staffId: string;
  tasks: StaffTaskRecord[];
  onUpdated: (m: StaffMember) => void;
}) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    const text = description.trim();
    if (!text) return;
    setSaving(true);
    try {
      const updated = await staffService.addTask(staffId, text);
      onUpdated(updated);
      setDescription("");
      toast.success("Task assigned.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign task.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId: string, current: TaskStatus) => {
    try {
      const next: TaskStatus = current === "completed" ? "pending" : "completed";
      const updated = await staffService.updateTaskStatus(staffId, taskId, next);
      onUpdated(updated);
      toast.success(next === "completed" ? "Task marked completed." : "Task marked pending.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Assign New Task
          </CardTitle>
          <CardDescription>Admin or doctor can assign work to this staff member.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="e.g. Prepare therapy room for afternoon session"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Button onClick={() => void handleAssign()} disabled={saving || !description.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            {saving ? "Assigning..." : "Assign Task"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task List</CardTitle>
          <CardDescription>{tasks.length} task(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Task</th>
                    <th className="py-2 pr-4">Assigned By</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="max-w-xs py-2 pr-4">{t.taskDescription}</td>
                      <td className="py-2 pr-4">{t.assignedBy}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={t.status === "completed" ? "secondary" : "outline"}>
                          {t.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{fmtDateTime(t.date)}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleTask(t.id, t.status)}
                        >
                          {t.status === "completed" ? "Reopen" : "Complete"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotesTab({
  staffId,
  notes,
  onUpdated,
}: {
  staffId: string;
  notes: StaffNoteRecord[];
  onUpdated: (m: StaffMember) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const text = noteText.trim();
    if (!text) return;
    setSaving(true);
    try {
      const updated = await staffService.addNote(staffId, text);
      onUpdated(updated);
      setNoteText("");
      toast.success("Note added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StickyNote className="h-5 w-5" />
            Add Internal Note
          </CardTitle>
          <CardDescription>
            Admin or doctor notes about this staff member. Not visible to the staff member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="e.g. Staff was helpful during therapy session"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
          />
          <Button onClick={() => void handleAdd()} disabled={saving || !noteText.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Add Note"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes History</CardTitle>
          <CardDescription>{notes.length} note(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No internal notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border p-3">
                  <p className="text-sm">{n.noteText}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.addedBy}
                    {n.addedByRole ? ` (${n.addedByRole})` : ""} · {fmtDateTime(n.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DOC_CATEGORY_LABELS: Record<StaffDocumentCategory, string> = {
  certificate: "Certificate",
  id_proof: "ID proof",
  other: "Other",
};

function DocumentsTab({
  staffId,
  documents,
  onUpdated,
}: {
  staffId: string;
  documents: StaffDocument[];
  onUpdated: (m: StaffMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<StaffDocumentCategory>("certificate");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { staff, item } = await staffService.uploadDocument(staffId, file, {
        title: title.trim() || file.name,
        category,
      });
      onUpdated({
        ...staff,
        documents: [item, ...(staff.documents ?? []).filter((d) => d.id !== item.id)],
      });
      setFile(null);
      setTitle("");
      setOpen(false);
      toast.success("Document uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const staff = await staffService.deleteDocument(staffId, deleteTarget.id);
      onUpdated(staff);
      setDeleteTarget(null);
      toast.success("Document deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Staff Documents
          </CardTitle>
          <CardDescription>Certificates, ID proof, and other HR files (admin only).</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload staff document</DialogTitle>
              <DialogDescription>Certificate, ID proof, or other HR document (max 15 MB).</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="staff-doc-title">Title</Label>
                <Input
                  id="staff-doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Nursing certificate"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as StaffDocumentCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="id_proof">ID proof</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="staff-doc-file">File</Label>
                <Input
                  id="staff-doc-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!file || uploading} onClick={() => void handleUpload()}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_CATEGORY_LABELS[doc.category] ?? doc.category} · {doc.fileType} · {fmtDateTime(doc.uploadedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc.fileName ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void staffService.openDocumentFile(staffId, doc.fileName!).catch((err) => {
                        toast.error(err instanceof Error ? err.message : "Could not open document.");
                      });
                    }}
                  >
                    Open
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(doc)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently removed from this staff profile.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl ${valueClassName ?? ""}`.trim()}>{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5">{typeof value === "string" ? value || "—" : value}</div>
    </div>
  );
}
