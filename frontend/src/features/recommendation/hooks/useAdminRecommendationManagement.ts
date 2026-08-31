import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { recommendationService } from "../services/recommendationService";
import type {
  AdminRecommendationManagement,
  AdminRecommendationQuery,
} from "../recommendation.types";

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export function useAdminRecommendationManagement(query: AdminRecommendationQuery) {
  const [data, setData] = useState<AdminRecommendationManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(query.search ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(query.search ?? "");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query.search]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getAdminManagement({
        ...query,
        search: debouncedSearch,
      });
      setData(result);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load AI recommendation data."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, query.condition, query.status, query.page, query.pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
