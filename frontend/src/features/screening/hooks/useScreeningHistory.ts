import { useCallback, useEffect, useState } from "react";
import { getHistory } from "@/features/screening/services/screeningService";
import type { PatientScreeningHistoryItem } from "@/features/screening/types/screening.types";

export function useScreeningHistory() {
  const [history, setHistory] = useState<PatientScreeningHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getHistory();
      setHistory(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load screening history.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { history, loading, error, reload };
}
