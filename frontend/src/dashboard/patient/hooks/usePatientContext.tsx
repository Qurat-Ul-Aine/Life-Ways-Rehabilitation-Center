import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { PATIENT_DASHBOARD_REFRESH } from "@/features/patient/utils/patientDashboardRefresh";

export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  address: string | null;
  condition: string;
  status: string;
  assignedDoctorName: string | null;
  assignedDoctorId: string | null;
  recoveryProgress: number;
  age: number | null;
  nationality: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  admissionDate: string | null;
  profileImageUrl: string | null;
  aboutMe: string | null;
  allergies: string | null;
  bloodGroup: string | null;
}

interface PatientContextValue {
  patientId: string | null;
  profile: PatientProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

function mapProfile(raw: Record<string, unknown>): PatientProfile {
  return {
    id: String(raw.id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    gender: String(raw.gender ?? ""),
    address: (raw.address as string | null) ?? null,
    condition: String(raw.condition ?? raw.primaryDiagnosis ?? ""),
    status: String(raw.status ?? "active"),
    assignedDoctorName: (raw.assignedDoctorName ?? raw.assigned_doctor_name ?? null) as string | null,
    assignedDoctorId: (raw.assignedDoctorId ?? raw.assigned_doctor_id ?? null) as string | null,
    recoveryProgress:
      typeof raw.recoveryProgress === "number"
        ? Math.min(100, Math.max(0, raw.recoveryProgress))
        : 0,
    age: typeof raw.age === "number" ? raw.age : null,
    nationality: (raw.nationality as string | null) ?? null,
    dateOfBirth: (raw.date_of_birth ?? raw.dateOfBirth ?? null) as string | null,
    emergencyContactName: (raw.emergency_contact_name ?? raw.emergencyContactName ?? null) as string | null,
    emergencyContactPhone: (raw.emergency_contact_phone ?? raw.emergencyContactPhone ?? null) as string | null,
    admissionDate: (raw.admissionDate as string | null) ?? null,
    profileImageUrl: (raw.profileImageUrl ?? raw.profile_image_url ?? null) as string | null,
    aboutMe: (raw.aboutMe ?? raw.about_me ?? null) as string | null,
    allergies: (raw.allergies as string | null) ?? null,
    bloodGroup: (raw.bloodGroup ?? raw.blood_group ?? null) as string | null,
  };
}

function buildFallbackProfile(user: { name?: string; email?: string } | null): PatientProfile {
  return {
    id: "",
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    gender: "",
    address: null,
    condition: "",
    status: "active",
    assignedDoctorName: null,
    assignedDoctorId: null,
    recoveryProgress: 0,
    age: null,
    nationality: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    admissionDate: null,
    profileImageUrl: null,
    aboutMe: null,
    allergies: null,
    bloodGroup: null,
  };
}

function usePatientProfileState(options?: { enabled?: boolean }): PatientContextValue {
  const enabled = options?.enabled ?? true;
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = () => setFetchCount((c) => c + 1);

  useEffect(() => {
    if (!enabled) return;

    if (!user || !["patient", "family"].includes(String(user.role ?? "").toLowerCase())) {
      setPatientId(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get("/patients/me")
      .then((res) => {
        if (cancelled) return;
        const raw = res.data;
        if (!raw?.id) {
          setPatientId(null);
          setProfile(buildFallbackProfile(user));
          return;
        }
        setPatientId(String(raw.id));
        setProfile(mapProfile(raw));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          setPatientId(null);
          setProfile(buildFallbackProfile(user));
        } else {
          setError("Could not load patient profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, fetchCount, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onRefresh = () => refetch();
    window.addEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
    return () => window.removeEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
  }, [enabled]);

  return { patientId, profile, loading, error, refetch };
}

export function PatientDashboardProvider({ children }: { children: ReactNode }) {
  const value = usePatientProfileState();
  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatientContext(): PatientContextValue {
  const ctx = useContext(PatientContext);
  const fallback = usePatientProfileState({ enabled: ctx === undefined });
  return ctx ?? fallback;
}
