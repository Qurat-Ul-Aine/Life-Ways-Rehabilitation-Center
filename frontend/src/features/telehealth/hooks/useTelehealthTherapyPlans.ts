import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { TherapyPlan } from "@/features/therapy/therapy.types";

type AppointmentRow = {
  patientId?: string;
  patient_id?: string;
};

const isActivePlan = (plan: TherapyPlan) =>
  String(plan.status ?? "ACTIVE").toUpperCase() === "ACTIVE";

export function planDisplayName(plan: TherapyPlan) {
  return plan.therapy_type ?? plan.title ?? "Therapy plan";
}

export function useTelehealthTherapyPlans(appointmentId: string) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [plans, setPlans] = useState<TherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apptRes = await api.get<AppointmentRow>(`/appointments/${appointmentId}`);
      const pid = apptRes.data?.patientId ?? apptRes.data?.patient_id ?? null;
      if (!pid) {
        setPatientId(null);
        setPlans([]);
        setError("Could not resolve patient for this appointment.");
        return;
      }

      setPatientId(pid);
      const plansRes = await api.get<{ items?: TherapyPlan[] }>("/therapy-plans", {
        params: { patientId: pid },
      });
      const active = (plansRes.data?.items ?? []).filter(isActivePlan);
      setPlans(active);
    } catch (err) {
      setPatientId(null);
      setPlans([]);
      setError(err instanceof Error ? err.message : "Failed to load therapy plans.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { patientId, plans, loading, error, reload: load };
}
