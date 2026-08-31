import { useEffect, useState } from "react";
import { Download, History, RotateCcw, UserMinus, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Intern } from "../intern.types";
import { internService } from "../services/internService";

type Props = {
  intern: Intern;
  onUpdated: (intern: Intern) => void;
};

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InternAdminActions({ intern, onUpdated }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const runAction = async (key: string, action: () => Promise<Intern>, successMsg: string) => {
    setBusy(key);
    try {
      const updated = await action();
      onUpdated(updated);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportReport = async (type: string, filename: string) => {
    setBusy(`export-${type}`);
    try {
      const blob = (await internService.exportReport({
        type,
        internId: intern.id,
        format: "csv",
      })) as Blob;
      downloadBlob(blob, filename);
      toast.success("Export downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const status = intern.applicationStatus ?? (intern.isActive ? "ACTIVE" : "INACTIVE");

  return (
    <div className="flex flex-wrap gap-2">
      {!intern.isActive ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy != null}
          onClick={() =>
            runAction("reactivate", () => internService.reactivate(intern.id), "Intern reactivated.")
          }
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          {busy === "reactivate" ? "Working..." : "Reactivate"}
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy != null}>
              <UserMinus className="mr-1 h-3.5 w-3.5" /> Deactivate
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate intern?</AlertDialogTitle>
              <AlertDialogDescription>
                {intern.name} will lose dashboard access until reactivated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  runAction(
                    "deactivate",
                    async () => {
                      await internService.remove(intern.id);
                      return internService.getById(intern.id);
                    },
                    "Intern deactivated.",
                  )
                }
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {status !== "COMPLETED" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy != null}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete Internship
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark internship complete?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks {intern.name}&apos;s internship as completed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  runAction(
                    "complete",
                    () => internService.complete(intern.id),
                    "Internship marked complete.",
                  )
                }
              >
                Complete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {intern.mentor ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy != null}>
              <UserCheck className="mr-1 h-3.5 w-3.5" /> Remove Mentor
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove mentor assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                {intern.mentor.name} will no longer supervise this intern.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  runAction(
                    "remove-mentor",
                    () => internService.removeMentor(intern.id),
                    "Mentor removed.",
                  )
                }
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        disabled={busy != null}
        onClick={() => exportReport("intern-attendance", `attendance-${intern.id}.csv`)}
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {busy === "export-intern-attendance" ? "Exporting..." : "Export Attendance"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={busy != null}
        onClick={() => exportReport("intern-training-logs", `training-logs-${intern.id}.csv`)}
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {busy === "export-intern-training-logs" ? "Exporting..." : "Export Training Logs"}
      </Button>
    </div>
  );
}

export function InternAuditLogPanel({ internId }: { internId: string }) {
  const [items, setItems] = useState<Array<{ action?: string; timestamp?: string; summary?: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    internService
      .getAuditLogs(internId)
      .then((data) => {
        if (cancelled) return;
        const rows = (data as { items?: typeof items })?.items ?? [];
        setItems(rows);
      })
      .catch(() => toast.error("Failed to load audit history."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [internId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading audit history...</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">No audit entries yet.</p>;

  return (
    <ul className="space-y-3">
      {items.map((entry, index) => (
        <li key={`${entry.timestamp}-${index}`} className="rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{entry.action ?? "Update"}</span>
            <span className="text-xs text-muted-foreground">
              <History className="mr-1 inline h-3 w-3" />
              {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
            </span>
          </div>
          {entry.summary ? <p className="mt-1 text-muted-foreground">{entry.summary}</p> : null}
        </li>
      ))}
    </ul>
  );
}
