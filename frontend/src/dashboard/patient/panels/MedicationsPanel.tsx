import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pill,
  Sun,
  Sunset,
  Moon,
  Download,
  FileText,
  CheckCircle2,
  ChevronRight,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import type { DosePeriod, Prescription } from "@/features/prescriptions/prescription.types";
import { prescriptionService } from "@/features/prescriptions/services/prescriptionService";

const PERIOD_META: Record<DosePeriod, { label: string; icon: typeof Sun }> = {
  MORNING: { label: "Morning", icon: Sun },
  AFTERNOON: { label: "Afternoon", icon: Sunset },
  NIGHT: { label: "Night", icon: Moon },
};

const formatDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "stopped") return "bg-red-50 text-red-700 border-red-200";
  if (s === "completed") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

function buildPrescriptionText(rx: Prescription) {
  return [
    "LIFEWAYS REHABILITATION CENTER",
    "PRESCRIPTION SUMMARY",
    "────────────────────────────",
    `Medication: ${rx.medicationName}`,
    `Dosage: ${rx.dosage}`,
    `Frequency: ${rx.frequency}`,
    `Duration: ${rx.duration ?? "—"}`,
    `Instructions: ${rx.instructions || "—"}`,
    `Start: ${formatDate(rx.startDate)}`,
    `End: ${formatDate(rx.endDate)}`,
    `Prescribed by: ${rx.prescribedByName}`,
    `Notes: ${rx.notes || "—"}`,
    `Status: ${rx.status}`,
  ].join("\n");
}

async function downloadDocument(urlPath: string, filename: string) {
  const { data } = await api.get(urlPath.replace(/^\/api/, ""), { responseType: "blob" });
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

function downloadTextSummary(rx: Prescription) {
  const blob = new Blob([buildPrescriptionText(rx)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${rx.medicationName.replace(/\s+/g, "-")}-prescription.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const MedicationsPanel = () => {
  const [all, setAll] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [marking, setMarking] = useState<DosePeriod | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await prescriptionService.list();
      setAll(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeMeds = useMemo(
    () => all.filter((m) => m.status === "Active"),
    [all],
  );

  const historyMeds = useMemo(
    () => all.filter((m) => m.status !== "Active"),
    [all],
  );

  const scheduleByPeriod = useMemo(() => {
    const map: Record<DosePeriod, Prescription[]> = {
      MORNING: [],
      AFTERNOON: [],
      NIGHT: [],
    };
    activeMeds.forEach((rx) => {
      (rx.schedule ?? []).forEach((p) => {
        if (map[p]) map[p].push(rx);
      });
    });
    return map;
  }, [activeMeds]);

  const handleMarkTaken = async (rx: Prescription, period: DosePeriod) => {
    setMarking(period);
    try {
      const updated = await prescriptionService.markTaken(rx.id, period);
      setAll((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selected?.id === updated.id) setSelected(updated);
    } finally {
      setMarking(null);
    }
  };

  const handleDownload = async (rx: Prescription) => {
    if (rx.documentUrl) {
      try {
        await downloadDocument(rx.documentUrl, rx.documentTitle ?? "prescription.pdf");
        return;
      } catch {
        // fallback to text summary
      }
    }
    downloadTextSummary(rx);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">My medications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prescriptions from your doctor — view only. Mark doses as taken when you complete them.
        </p>
      </div>

      {/* 1. Active Medications */}
      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-primary/5 px-5 py-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Pill size={18} className="text-primary" />
            Active medications
          </h3>
        </div>
        {activeMeds.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No active medications. Your doctor will prescribe here when needed.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {activeMeds.map((rx) => (
              <button
                key={rx.id}
                type="button"
                onClick={() => setSelected(rx)}
                className="w-full flex flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Pill size={18} />
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-xs text-muted-foreground">Medication</p>
                    <p className="text-sm font-semibold">{rx.medicationName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dosage · Frequency</p>
                    <p className="text-sm">{rx.dosage} · {rx.frequency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration · Prescribed by</p>
                    <p className="text-sm">{rx.duration} · {rx.prescribedByName}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-xs", statusClass(rx.status))}>
                  {rx.status}
                </Badge>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. Medication Schedule */}
      <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <h3 className="text-base font-semibold text-foreground mb-4">Today&apos;s medication schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(PERIOD_META) as DosePeriod[]).map((period) => {
            const meta = PERIOD_META[period];
            const Icon = meta.icon;
            const items = scheduleByPeriod[period];
            return (
              <div key={period} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-primary" />
                  <p className="text-sm font-semibold">{meta.label}</p>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing scheduled</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((rx) => {
                      const taken = (rx.takenToday ?? []).includes(period);
                      return (
                        <li key={`${rx.id}-${period}`} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn("text-sm font-medium", taken && "line-through text-muted-foreground")}>
                              {taken && <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />}
                              {rx.medicationName}
                            </p>
                            <p className="text-xs text-muted-foreground">{rx.dosage}</p>
                          </div>
                          {!taken && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs shrink-0"
                              disabled={marking === period}
                              onClick={() => handleMarkTaken(rx, period)}
                            >
                              Taken
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Prescription Documents */}
      {activeMeds.some((r) => r.documentUrl || true) && (
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <h3 className="text-base font-semibold text-foreground mb-3">Prescription documents</h3>
          <div className="flex flex-wrap gap-2">
            {activeMeds.map((rx) => (
              <Button key={rx.id} size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownload(rx)}>
                <Download size={14} />
                {rx.documentTitle ? `Download ${rx.documentTitle}` : `Download ${rx.medicationName}`}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* 5. Medication History */}
      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center gap-2">
          <History size={18} className="text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Medication history</h3>
        </div>
        {historyMeds.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No previous prescriptions yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {historyMeds.map((rx) => (
              <li key={rx.id}>
                <button
                  type="button"
                  onClick={() => setSelected(rx)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/20"
                >
                  <div>
                    <p className="text-sm font-medium">{rx.medicationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(rx.startDate)} – {formatDate(rx.endDate)} · {rx.prescribedByName}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{rx.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Prescription Details Dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} />
              Prescription details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <dl className="space-y-3 text-sm">
              {[
                ["Medicine", selected.medicationName],
                ["Dosage", selected.dosage],
                ["Instructions", selected.instructions || "—"],
                ["Frequency", selected.frequency],
                ["Start date", formatDate(selected.startDate)],
                ["End date", formatDate(selected.endDate)],
                ["Doctor", selected.prescribedByName],
                ["Notes", selected.notes || "—"],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
                  <dd className="mt-0.5 text-foreground">{value}</dd>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownload(selected)}>
                  <Download size={14} /> Download prescription
                </Button>
                {selected.documentUrl && resolveUploadUrl(selected.documentUrl) && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={resolveUploadUrl(selected.documentUrl)} target="_blank" rel="noreferrer">
                      View file
                    </a>
                  </Button>
                )}
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationsPanel;
