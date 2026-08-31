import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TrainingLogForm from "../components/TrainingLogForm";
import { internService } from "../services/internService";
import type { Intern } from "../intern.types";

export default function InternAddLog() {
  const navigate = useNavigate();
  const [intern, setIntern] = useState<Intern | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    internService
      .getMe()
      .then(setIntern)
      .catch((err) => toast.error(err.message))
      .finally(() => setFetching(false));
  }, []);

  if (fetching) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      </DashboardLayout>
    );
  }

  if (!intern) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-destructive">Intern profile not found.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Training Log"
        subtitle="Record your daily clinical hours, tasks, and learning reflections."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Log Entry</CardTitle>
          <CardDescription>
            Logs are securely stored and visible to your mentor and administration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingLogForm
            loading={loading}
            onSubmit={async (payload) => {
              setLoading(true);
              try {
                await internService.addLog(intern.id, payload);
                toast.success("Training log added successfully.");
                navigate("/intern/dashboard");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add log.");
              } finally {
                setLoading(false);
              }
            }}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
