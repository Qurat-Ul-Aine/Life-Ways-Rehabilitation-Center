import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { adminSettingsService } from "@/features/admin/services/adminSettingsService";
import type { HospitalSettings } from "@/features/admin/types/admin-settings.types";

export const DEFAULT_HOSPITAL: HospitalSettings = {
  hospitalName: "Life Ways Rehabilitation Center",
  logoUrl: null,
  contactEmail: "info@lifewaysrehab.com",
  contactPhone: "+92 51 234 5678",
  address: "123 Medical Complex, Blue Area, Islamabad, Pakistan",
  updatedAt: null,
};

type HospitalSettingsContextValue = {
  hospital: HospitalSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  setHospital: (next: HospitalSettings) => void;
};

const HospitalSettingsContext = createContext<HospitalSettingsContextValue | null>(null);

export function HospitalSettingsProvider({ children }: { children: ReactNode }) {
  const [hospital, setHospital] = useState<HospitalSettings>(DEFAULT_HOSPITAL);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminSettingsService.getHospital();
      setHospital(data);
    } catch {
      setHospital(DEFAULT_HOSPITAL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <HospitalSettingsContext.Provider
      value={{ hospital, loading, refresh, setHospital }}
    >
      {children}
    </HospitalSettingsContext.Provider>
  );
}

export function useHospitalSettings() {
  const ctx = useContext(HospitalSettingsContext);
  if (!ctx) {
    return {
      hospital: DEFAULT_HOSPITAL,
      loading: false,
      refresh: async () => {},
      setHospital: () => {},
    };
  }
  return ctx;
}
