import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { preferencesService } from "@/features/settings/services/preferencesService";

/** Loads saved theme from user preferences when authenticated. */
export function ThemeSync() {
  const { isAuthenticated } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    preferencesService
      .getMine()
      .then((prefs) => {
        if (!cancelled && prefs.theme) {
          setTheme(prefs.theme);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setTheme]);

  return null;
}
