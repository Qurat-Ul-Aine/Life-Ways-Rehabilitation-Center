import { useCallback, useEffect, useState } from "react";
import { patientService } from "@/features/patient/services/patientService";
import type { PatientDocument } from "@/features/patient/patient.types";

export function usePatientDocuments() {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await patientService.listDocuments();
      setDocuments(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { documents, loading, error, refetch };
}
