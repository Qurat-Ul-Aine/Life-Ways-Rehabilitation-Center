import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TrainingLogEditDialog from "../components/TrainingLogEditDialog";
import TrainingLogForm from "../components/TrainingLogForm";
import TrainingLogsList from "../components/TrainingLogsList";
import { internService } from "../services/internService";
import type { Intern, TrainingLog, TrainingLogsResult } from "../intern.types";

export default function InternMyLogs() {
  const [intern, setIntern] = useState<Intern | null>(null);
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

  const loadLogs = useCallback(async (internId: string) => {
    setLoading(true);
    try {
      setLogs(await internService.getLogs(internId, { fromDate, toDate }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    internService
      .getMe()
      .then(setIntern)
      .catch((err) => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (!intern) return;
    void loadLogs(intern.id);
  }, [intern, loadLogs]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Training Logs & Attendance"
        subtitle="Submit daily logs and review your clinical training history."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Add Log Entry</CardTitle>
          <CardDescription>Record hours worked, tasks completed, and learning notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingLogForm
            loading={logLoading}
            onSubmit={async (payload) => {
              if (!intern) return;
              setLogLoading(true);
              try {
                await internService.addLog(intern.id, payload);
                toast.success("Training log added successfully.");
                await loadLogs(intern.id);
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
            if (intern) await loadLogs(intern.id);
          } finally {
            setLogLoading(false);
          }
        }}
      />
    </DashboardLayout>
  );
}
