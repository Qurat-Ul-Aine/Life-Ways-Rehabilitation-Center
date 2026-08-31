import { useCallback, useEffect, useState } from "react";
import { patientService } from "@/features/patient/services/patientService";
import type { Patient, PatientListQuery, PatientListResult } from "@/features/patient/patient.types";

export function usePatients(query: PatientListQuery) {
  const [data, setData] = useState<PatientListResult>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await patientService.list(query);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch patients.");
    } finally {
      setLoading(false);
    }
  }, [query.search, query.status, query.page, query.pageSize]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...data, loading, error, refetch };
}

export function usePatient(id: string | undefined) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setPatient(await patientService.getById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { patient, loading, error, refetch, setPatient };
}
