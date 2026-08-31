import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { doctorDashboardService } from "../services/doctorDashboardService";
import type {
  DoctorDashboardSummary,
  DoctorDashboardContextValue,
  DoctorPatient,
} from "../types/doctor-dashboard.types";

// ─── Context ──────────────────────────────────────────────────────────────────
const DoctorDashboardContext = createContext<DoctorDashboardContextValue | null>(null);

// ─── Helper: build DoctorPatient[] from patientRecovery (until backend extends DTO) ──
function buildPatients(data: DoctorDashboardSummary): DoctorPatient[] {
  return (data.patientRecovery ?? []).map((p) => ({
    id:                  p.id,
    initials:            p.initials,
    name:                p.name,
    program:             p.condition ?? null,
    therapyType:         null,   // will come from extended backend DTO
    status:              null,   // will come from extended backend DTO
    lastSessionDate:     null,   // will come from extended backend DTO
    nextAppointmentDate: null,   // will come from extended backend DTO
    progressPct:         p.recoveryScore,
    recoveryScore:       p.recoveryScore,
  }));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function DoctorDashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData]       = useState<DoctorDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await doctorDashboardService.getSummary();
      if (result?.success === false) {
        throw new Error(result.message ?? "Failed to load dashboard");
      }
      const payload = result?.data ?? result;

      // Backfill patients[] only when backend has not yet returned the native array
      if (payload && (!payload.patients || payload.patients.length === 0)) {
        payload.patients = buildPatients(payload);
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  return (
    <DoctorDashboardContext.Provider value={{ data, loading, error, refetch: fetchDashboard }}>
      {children}
    </DoctorDashboardContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDoctorDashboardContext(): DoctorDashboardContextValue {
  const ctx = useContext(DoctorDashboardContext);
  if (!ctx) {
    throw new Error("useDoctorDashboardContext must be used inside <DoctorDashboardProvider>");
  }
  return ctx;
}
/**
 * Backward-compatible alias — existing panels using useDoctorDashboard()
 * will keep working without any changes.
 */
export { useDoctorDashboardContext as useDoctorDashboard };
