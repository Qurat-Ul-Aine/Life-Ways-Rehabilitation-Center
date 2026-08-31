import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { therapyService } from "../services/therapyService";
import type { TherapyPlan, TherapyReportSummary, TherapySessionRecord } from "../therapy.types";

export default function TherapyReports() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TherapyPlan | null>(null);
  const [summary, setSummary] = useState<TherapyReportSummary | null>(null);
  const [sessions, setSessions] = useState<TherapySessionRecord[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([therapyService.getPlan(id), therapyService.getReport(id), therapyService.listSessions(id)])
      .then(([p, r, s]) => { setPlan(p); setSummary(r); setSessions(s); })
      .catch((e) => toast.error(e.message));
  }, [id]);

  const exportCsv = () => {
    if (!plan || !summary) return;
    const rows = [
      ["Plan", plan.title],
      ["Patient", plan.patientName],
      ["Therapist", plan.therapistName],
      ["Total sessions", String(summary.totalSessions)],
      ["Improved sessions", String(summary.improvedCount)],
      ["Avg pain level", summary.averagePainLevel?.toFixed(1) ?? "N/A"],
      ["Generated at", summary.generatedAt],
      [],
      ["Date", "Therapist", "Outcome", "Pain", "Duration (min)", "Notes"],
      ...sessions.map((s) => [s.date, s.therapistName, s.outcome, String(s.painLevel ?? ""), String(s.durationMinutes), s.notes.replace(/"/g, '""')]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `therapy-report-${plan.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!plan || !summary) return <><p className="text-sm text-muted-foreground">Loading...</p></>;

  return (
    <>
      <PageHeader
        title="Therapy report"
        subtitle={plan.title}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <Stat label="Total sessions" value={summary.totalSessions} />
        <Stat label="Improved" value={summary.improvedCount} />
        <Stat label="Exercises completed" value={summary.completedExercises} />
        <Stat label="Avg pain" value={summary.averagePainLevel?.toFixed(1) ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session log</CardTitle>
          <CardDescription>{sessions.length} session(s) recorded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No sessions yet.</p> :
            sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <span>{s.date} · {s.therapistName}</span>
                <span className="text-xs text-muted-foreground">{s.outcome} · {s.durationMinutes} min{typeof s.painLevel === "number" ? ` · pain ${s.painLevel}/10` : ""}</span>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}