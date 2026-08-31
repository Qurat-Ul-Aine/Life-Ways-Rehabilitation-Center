import { useCallback, useEffect, useState } from "react";
import { internService } from "../services/internService";
import type { Mentor } from "../intern.types";

export function useMentorList() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMentors(await internService.listMentors());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mentors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { mentors, loading, error, refetch };
}
