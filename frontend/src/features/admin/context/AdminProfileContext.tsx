import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { adminSettingsService } from "@/features/admin/services/adminSettingsService";
import type { AdminProfile } from "@/features/admin/types/admin-settings.types";

type AdminProfileContextValue = {
  profile: AdminProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (next: AdminProfile) => void;
  updateAvatar: (avatarUrl: string) => void;
};

const AdminProfileContext = createContext<AdminProfileContextValue | null>(null);

export function AdminProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== "admin") {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      const data = await adminSettingsService.getProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
  }, []);

  return (
    <AdminProfileContext.Provider
      value={{ profile, loading, refresh, setProfile, updateAvatar }}
    >
      {children}
    </AdminProfileContext.Provider>
  );
}

export function useAdminProfile() {
  const ctx = useContext(AdminProfileContext);
  if (!ctx) {
    return {
      profile: null,
      loading: false,
      refresh: async () => {},
      setProfile: () => {},
      updateAvatar: () => {},
    };
  }
  return ctx;
}
