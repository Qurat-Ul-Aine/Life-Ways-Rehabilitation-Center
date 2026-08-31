import { useCallback, useEffect, useState } from "react";
import { internService } from "../services/internService";
import type {
  Intern,
  InternDashboardData,
  InternListQuery,
  InternListResult,
  TrainingLogsResult,
} from "../intern.types";

export function useInternList(query: InternListQuery) {
  const [data, setData] = useState<InternListResult>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await internService.list(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interns.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...data, loading, error, refetch };
}

export function useInternMember(id: string | undefined) {
  const [member, setMember] = useState<Intern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setMember(await internService.getById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intern.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { member, loading, error, refetch, setMember };
}

export function useInternLogs(internId: string | undefined, fromDate?: string, toDate?: string) {
  const [data, setData] = useState<TrainingLogsResult>({
    items: [],
    total: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await internService.getLogs(internId, { fromDate, toDate }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [internId, fromDate, toDate]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...data, loading, error, refetch };
}

export function useInternDashboard() {
  const [data, setData] = useState<InternDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await internService.getDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
