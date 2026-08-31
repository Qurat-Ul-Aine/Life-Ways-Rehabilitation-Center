import { useCallback, useEffect, useState } from "react";
import { preferencesService } from "../services/preferencesService";
import type { UserPreferences } from "../settings.types";

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await preferencesService.getMine();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { preferences, loading, error, reload: load, setPreferences };
}
