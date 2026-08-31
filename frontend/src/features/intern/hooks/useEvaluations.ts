import { useCallback, useEffect, useState } from "react";
import { internService } from "../services/internService";
import type { InternEvaluation } from "../intern.types";

export function useEvaluations(internId: string | undefined) {
  const [items, setItems] = useState<InternEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await internService.getEvaluations(internId);
      setItems(Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evaluations.");
    } finally {
      setLoading(false);
    }
  }, [internId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
