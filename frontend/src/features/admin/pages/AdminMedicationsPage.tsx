import { useCallback, useEffect, useState } from "react";
import { Pill, ShieldAlert, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Prescription, PrescriptionAuditRecord } from "@/features/prescriptions/prescription.types";
import { prescriptionService } from "@/features/prescriptions/services/prescriptionService";

type AdminRxAction = "invalidate" | "delete";

const formatDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function AdminMedicationsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [audit, setAudit] = useState<PrescriptionAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFilter, setPatientFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: AdminRxAction; rx: Prescription } | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, auditItems] = await Promise.all([
        prescriptionService.list({
          patientId: patientFilter.trim() || undefined,
          includeDeleted: showDeleted ? "1" : undefined,
        }),
        prescriptionService.listAudit(patientFilter.trim() || undefined),
      ]);
      setPrescriptions(items);
      setAudit(auditItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, [patientFilter, showDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  const openActionDialog = (type: AdminRxAction, rx: Prescription) => {
    setPendingAction({ type, rx });
    setActionError(null);
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    if (acting) return;
    setActionDialogOpen(false);
    setPendingAction(null);
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActing(true);
    setActionError(null);
    try {
      if (pendingAction.type === "invalidate") {
        await prescriptionService.markInvalid(pendingAction.rx.id);
      } else {
        await prescriptionService.softDelete(pendingAction.rx.id);
      }
      setActionDialogOpen(false);
      setPendingAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Medications & prescriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all prescriptions, audit trail, and manage record validity.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Filter by patient ID</label>
          <Input
            className="w-64"
            placeholder="Patient UUID (optional)"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDeleted((v) => !v)}>
          {showDeleted ? "Hide deleted" : "Include soft-deleted"}
        </Button>
        <Button size="sm" onClick={load}>Refresh</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Pill size={16} />
          <h2 className="font-semibold text-sm">All medications ({prescriptions.length})</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No prescription records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Patient</th>
                  <th className="px-4 py-2">Medication</th>
                  <th className="px-4 py-2">Doctor</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id} className="border-b border-border/50 last:border-none">
                    <td className="px-4 py-3">{rx.patientName ?? rx.patientId.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium">{rx.medicationName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{rx.prescribedByName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {rx.isInvalid ? "Invalid" : rx.status}
                        {rx.deletedAt ? " · Deleted" : ""}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!rx.isInvalid && !rx.deletedAt && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openActionDialog("invalidate", rx)}
                            title="Mark invalid"
                          >
                            <ShieldAlert size={14} />
                          </Button>
                        )}
                        {!rx.deletedAt && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => openActionDialog("delete", rx)}
                            title="Soft delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <History size={16} />
          <h2 className="font-semibold text-sm">Audit records</h2>
        </div>
        {audit.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No audit entries yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 max-h-80 overflow-y-auto">
            {audit.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{row.summary ?? row.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.actorName} ({row.actorRole}) · {formatDate(row.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={actionDialogOpen} onOpenChange={(open) => !open && closeActionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete" ? "Soft-delete prescription?" : "Mark prescription as invalid?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? (
                pendingAction.type === "delete" ? (
                  <>
                    Soft-delete <span className="font-medium text-foreground">{pendingAction.rx.medicationName}</span> for{" "}
                    <span className="font-medium text-foreground">{pendingAction.rx.patientName ?? "this patient"}</span>?
                    It will be hidden from patients and doctors but kept in admin records.
                  </>
                ) : (
                  <>
                    Mark <span className="font-medium text-foreground">{pendingAction.rx.medicationName}</span> for{" "}
                    <span className="font-medium text-foreground">{pendingAction.rx.patientName ?? "this patient"}</span> as
                    invalid? Patients will no longer see this prescription as active.
                  </>
                )
              ) : (
                "Confirm this action on the prescription record."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting} onClick={closeActionDialog}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmAction()}
              disabled={acting}
            >
              {acting
                ? pendingAction?.type === "delete"
                  ? "Deleting…"
                  : "Updating…"
                : pendingAction?.type === "delete"
                  ? "Soft-delete"
                  : "Mark invalid"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
