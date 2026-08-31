import { useCallback, useEffect, useState } from "react";
import { internService } from "@/features/intern/services/internService";
import type { InternDashboardData } from "@/features/intern/intern.types";

export function useInternContext() {
  const [data, setData] = useState<InternDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await internService.getDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intern data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
