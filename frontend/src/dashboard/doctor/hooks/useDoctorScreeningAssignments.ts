import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listDoctorAssignments, getConditions } from "@/features/screening/services/screeningService";
import type { AdminScreeningItem, ScreeningCondition } from "@/features/screening/types/screening.types";

export function useDoctorScreeningAssignments(initialRiskFilter = "all") {
  const [items, setItems] = useState<AdminScreeningItem[]>([]);
  const [conditions, setConditions] = useState<ScreeningCondition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState(initialRiskFilter);

  useEffect(() => {
    getConditions().then(setConditions).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (conditionFilter !== "all") params.condition = conditionFilter;
      if (riskFilter !== "all") params.riskLevel = riskFilter;
      const list = await listDoctorAssignments(params);
      setItems(Array.isArray(list.items) ? list.items : []);
      setTotal(list.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load patient screening results.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, conditionFilter, riskFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const highRiskCount = items.filter((i) => i.riskLevel === "high").length;

  return {
    items,
    conditions,
    total,
    loading,
    search,
    conditionFilter,
    riskFilter,
    highRiskCount,
    setSearch,
    setConditionFilter,
    setRiskFilter,
    reload: load,
  };
}
