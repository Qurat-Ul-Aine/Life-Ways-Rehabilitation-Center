import { useCallback, useEffect, useState } from "react";
import { staffService } from "../services/staffService";
import type { StaffListQuery, StaffListResult, StaffMember } from "../staff.types";

export function useStaffList(query: StaffListQuery) {
  const [data, setData] = useState<StaffListResult>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await staffService.list(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, [query.search, query.role, query.status, query.page, query.pageSize]);

  useEffect(() => { void refetch(); }, [refetch]);
  return { ...data, loading, error, refetch };
}

export function useStaffMember(id: string | undefined) {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setMember(await staffService.getById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff member.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);
  return { member, loading, error, refetch, setMember };
}
