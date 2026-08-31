import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import TrainingLogForm from "@/features/intern/components/TrainingLogForm";
import TrainingLogsList from "@/features/intern/components/TrainingLogsList";
import TrainingLogEditDialog from "@/features/intern/components/TrainingLogEditDialog";
import { internService } from "@/features/intern/services/internService";
import type { TrainingLog, TrainingLogsResult } from "@/features/intern/intern.types";
import { useInternDashboardContext } from "../hooks/InternDashboardContext";
import { DashboardState } from "./DashboardState";

function TrainingLogsContent({ internId }: { internId: string }) {
  const { refetch } = useInternDashboardContext();
  const [fromDate, setFromDate] = useState<string>();
  const [toDate, setToDate] = useState<string>();
  const [logs, setLogs] = useState<TrainingLogsResult>({
    items: [],
    total: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [editLog, setEditLog] = useState<TrainingLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await internService.getLogs(internId, { fromDate, toDate }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [internId, fromDate, toDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Logs"
        subtitle="Submit daily logs and review your clinical training history."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Log Entry</CardTitle>
          <CardDescription>
            Record hours worked, tasks completed, and learning notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingLogForm
            loading={logLoading}
            onSubmit={async (payload) => {
              setLogLoading(true);
              try {
                await internService.addLog(internId, payload);
                toast.success("Training log added successfully.");
                await loadLogs();
                await refetch();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add log.");
              } finally {
                setLogLoading(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <TrainingLogsList
        logs={logs.items}
        totalHours={logs.totalHours}
        loading={loading}
        fromDate={fromDate}
        toDate={toDate}
        onFilterChange={(from, to) => {
          setFromDate(from);
          setToDate(to);
        }}
        onEdit={(log) => setEditLog(log)}
      />

      <TrainingLogEditDialog
        open={Boolean(editLog)}
        log={editLog}
        loading={logLoading}
        onOpenChange={(open) => {
          if (!open) setEditLog(null);
        }}
        onSave={async (logId, payload) => {
          setLogLoading(true);
          try {
            await internService.updateLog(logId, payload);
            toast.success("Training log updated.");
            setEditLog(null);
            await loadLogs();
            await refetch();
          } finally {
            setLogLoading(false);
          }
        }}
      />
    </div>
  );
}

export default function TrainingLogsSection() {
  return (
    <DashboardState>
      {(data) => <TrainingLogsContent internId={data.intern.id} />}
    </DashboardState>
  );
}
