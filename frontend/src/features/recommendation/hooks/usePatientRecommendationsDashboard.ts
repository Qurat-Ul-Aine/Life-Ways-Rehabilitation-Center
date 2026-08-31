import { useCallback, useEffect, useState } from "react";
import { recommendationService } from "../services/recommendationService";
import type { PatientRecommendationsDashboard } from "../recommendation.types";

export function usePatientRecommendationsDashboard() {
  const [data, setData] = useState<PatientRecommendationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
