import { useCallback, useEffect, useState } from "react";
import { screeningService } from "@/features/screening/services/screeningService";
import type { AdminScreeningItem, ScreeningCondition } from "@/features/screening/types/screening.types";

type AdminScreeningListQuery = {
  search?: string;
  riskLevel?: string;
  condition?: string;
  page?: number;
  pageSize?: number;
};

export function useAdminScreeningList(query: AdminScreeningListQuery) {
  const [items, setItems] = useState<AdminScreeningItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<ScreeningCondition[]>([]);

  useEffect(() => {
    screeningService.getConditions().then(setConditions).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      };
      if (query.search) params.search = query.search;
      if (query.riskLevel && query.riskLevel !== "all") params.riskLevel = query.riskLevel;
      if (query.condition && query.condition !== "all") params.condition = query.condition;

      const list = await screeningService.listAdmin(params);
      setItems(list.items);
      setTotal(list.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load screenings.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query.search, query.riskLevel, query.condition, query.page, query.pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, total, loading, error, conditions, reload };
}
