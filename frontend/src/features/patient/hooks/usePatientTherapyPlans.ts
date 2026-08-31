import { useCallback, useEffect, useState } from "react";
import { therapyService } from "@/features/therapy/services/therapyService";
import type { TherapyPlan } from "@/features/therapy/therapy.types";
import { PATIENT_DASHBOARD_REFRESH } from "@/features/patient/utils/patientDashboardRefresh";
import { PATIENT_THERAPY_REFRESH } from "@/features/patient/utils/patientTherapyRefresh";

const POLL_MS = 5_000;

export function usePatientTherapyPlans(patientId: string | null | undefined, profileLoading: boolean) {
  const [plans, setPlans] = useState<TherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (silent = false) => {
    if (!patientId) {
      setPlans([]);
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const items = await therapyService.listByPatient(patientId);
      setPlans(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load therapy plans.");
      setPlans([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (profileLoading) return;

    void refetch();

    const onRefresh = () => void refetch(true);
    const onFocus = () => void refetch(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch(true);
    };

    window.addEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
    window.addEventListener(PATIENT_THERAPY_REFRESH, onRefresh);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const pollId = window.setInterval(() => void refetch(true), POLL_MS);

    return () => {
      window.removeEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
      window.removeEventListener(PATIENT_THERAPY_REFRESH, onRefresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(pollId);
    };
  }, [patientId, profileLoading, refetch]);

  return { plans, loading, error, refetch };
}
