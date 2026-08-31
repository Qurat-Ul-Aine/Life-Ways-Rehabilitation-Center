import { useCallback, useEffect, useState } from "react";
import { internService } from "../services/internService";

export function useProgress(internId: string | undefined) {
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    setError(null);
    try {
      setProgress(await internService.getProgress(internId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress.");
    } finally {
      setLoading(false);
    }
  }, [internId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { progress, loading, error, refetch };
}
