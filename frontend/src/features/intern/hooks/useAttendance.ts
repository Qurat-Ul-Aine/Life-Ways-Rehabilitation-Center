import { useCallback, useEffect, useState } from "react";
import { internService } from "../services/internService";
import type { AttendanceRecord } from "../intern.types";

export function useAttendance(
  internId: string | undefined,
  params?: { fromDate?: string; toDate?: string; status?: string },
) {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await internService.getAttendance(internId, params);
      setItems(result.items ?? []);
      setTotal(result.total ?? 0);
      setAttendancePercentage(result.attendancePercentage ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [internId, params?.fromDate, params?.toDate, params?.status]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, total, attendancePercentage, loading, error, refetch };
}
