
import { useCallback, useEffect, useRef, useState } from "react";
import { patientService } from "@/features/patient/services/patientService";
import type { DashboardSummary } from "@/features/patient/patient.types";
import { PATIENT_DASHBOARD_REFRESH } from "@/features/patient/utils/patientDashboardRefresh";

export function usePatientDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchDashboard = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await patientService.getDashboardSummary();
      if (mountedRef.current) {
        setData(result);
        if (!opts?.silent) setError(null);
      }
    } catch (err) {
      if (mountedRef.current && !opts?.silent) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      }
    } finally {
      if (mountedRef.current && !opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => fetchDashboard({ silent: true }), [fetchDashboard]);

  useEffect(() => {
    mountedRef.current = true;

    void fetchDashboard();

    intervalRef.current = setInterval(() => {
      void fetchDashboard({ silent: true });
    }, 60 * 1000);

    const onRefresh = () => {
      void fetchDashboard({ silent: true });
    };
    window.addEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);

    const onFocus = () => {
      void fetchDashboard({ silent: true });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDashboard]);

  return { data, loading, error, refetch };
}
