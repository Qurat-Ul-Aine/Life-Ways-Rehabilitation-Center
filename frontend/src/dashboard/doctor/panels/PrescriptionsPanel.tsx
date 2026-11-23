import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Pill, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import type { Prescription } from "@/features/prescriptions/prescription.types";
import { prescriptionService } from "@/features/prescriptions/services/prescriptionService";
import PrescriptionFormDialog from "@/features/prescriptions/components/PrescriptionFormDialog";

const statusVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active") return "default";
  if (s === "stopped" || s === "invalid") return "destructive";
  if (s === "completed") return "secondary";
  return "outline";
};

const PrescriptionsPanel = () => {
  const { data, loading, refetch } = useDoctorDashboard();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stoppingRx, setStoppingRx] = useState<Prescription | null>(null);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const patients = useMemo(
    () =>
      (data?.patientRecovery ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [data?.patientRecovery],
  );

  const loadPrescriptions = useCallback(async () => {
    setRxLoading(true);
    setError(null);
    try {
      const items = await prescriptionService.list();
      setPrescriptions(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setRxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const openStopDialog = (rx: Prescription) => {
    setStoppingRx(rx);
    setStopError(null);
    setStopDialogOpen(true);
  };

  const confirmStop = async () => {
    if (!stoppingRx) return;
    setStopping(true);
    setStopError(null);
    try {
      await prescriptionService.stop(stoppingRx.id);
      setStopDialogOpen(false);
      setStoppingRx(null);
      await loadPrescriptions();
    } catch (err) {
      setStopError(err instanceof Error ? err.message : "Failed to stop medication");
    } finally {
      setStopping(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (rx: Prescription) => {
    setEditing(rx);
    setDialogOpen(true);
  };

  const activeCount = prescriptions.filter((r) => r.status === "Active").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Prescriptions</h2>
          <p className="text-sm text-muted-foreground">
            Prescribe, update, or stop medications — patients see changes on their Medications page.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={patients.length === 0}>
          <Plus size={14} /> Prescribe medicine
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active", value: activeCount },
          { label: "Total", value: prescriptions.length },
          { label: "Patients", value: patients.length },
          { label: "Stopped", value: prescriptions.filter((r) => r.status === "Stopped").length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.2fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_auto] gap-3 px-4 py-3 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Patient</span>
          <span>Medication</span>
          <span>Dosage</span>
          <span>Frequency</span>
          <span>Status</span>
          <span>Duration</span>
          <span>Actions</span>
        </div>

        {loading || rxLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive text-center">{error}</p>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Pill size={28} className="text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No prescriptions yet</p>
            <Button size="sm" className="mt-3" onClick={openCreate} disabled={patients.length === 0}>
              Write first prescription
            </Button>
          </div>
        ) : (
          prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_0.8fr_0.9fr_0.8fr_0.7fr_auto] gap-2 md:gap-3 items-center px-4 py-3 border-b border-border/60 last:border-none"
            >
              <div>
                <p className="text-sm font-semibold">{rx.patientName ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground md:hidden">{rx.medicationName}</p>
              </div>
              <p className="text-sm hidden md:block">{rx.medicationName}</p>
              <p className="text-sm text-muted-foreground">{rx.dosage}</p>
              <p className="text-sm text-muted-foreground">{rx.frequency}</p>
              <Badge variant={statusVariant(rx.status) as "default"} className="w-fit text-xs">
                {rx.status}
              </Badge>
              <p className="text-xs text-muted-foreground">{rx.duration ?? "—"}</p>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(rx)} aria-label="Edit">
                  <Pencil size={14} />
                </Button>
                {rx.status === "Active" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => openStopDialog(rx)}
                    aria-label="Stop"
                  >
                    <Square size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <PrescriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patients={patients}
        editing={editing}
        onSaved={() => {
          void loadPrescriptions();
          void refetch();
        }}
      />

      <AlertDialog
        open={stopDialogOpen}
        onOpenChange={(open) => {
          if (!stopping) {
            setStopDialogOpen(open);
            if (!open) {
              setStoppingRx(null);
              setStopError(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop medication?</AlertDialogTitle>
            <AlertDialogDescription>
              {stoppingRx ? (
                <>
                  Stop <span className="font-medium text-foreground">{stoppingRx.medicationName}</span> for{" "}
                  <span className="font-medium text-foreground">{stoppingRx.patientName ?? "this patient"}</span>?
                  The patient will no longer see it as active on their Medications page.
                </>
              ) : (
                "This will mark the prescription as stopped."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {stopError && <p className="text-sm text-destructive">{stopError}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopping}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void confirmStop()} disabled={stopping}>
              {stopping ? "Stopping…" : "Stop medication"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PrescriptionsPanel;
