import { useCallback, useEffect, useState } from "react";
import { patientService } from "@/features/patient/services/patientService";
import type { RecoverySummary } from "@/features/patient/patient.types";
import { PATIENT_DASHBOARD_REFRESH } from "@/features/patient/utils/patientDashboardRefresh";
import { PATIENT_THERAPY_REFRESH } from "@/features/patient/utils/patientTherapyRefresh";

const POLL_MS = 60_000;

export function usePatientRecovery() {
  const [data, setData] = useState<RecoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await patientService.getRecoverySummary();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recovery data.");
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await patientService.getRecoverySummary();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load recovery data.");
          setData(null);
        }
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    };

    void load();

    const onRefresh = () => void load(true);
    const onFocus = () => void load(true);

    window.addEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
    window.addEventListener(PATIENT_THERAPY_REFRESH, onRefresh);
    window.addEventListener("focus", onFocus);

    const pollId = window.setInterval(() => void load(true), POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
      window.removeEventListener(PATIENT_THERAPY_REFRESH, onRefresh);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(pollId);
    };
  }, []);

  return { data, loading, error, refetch };
}
