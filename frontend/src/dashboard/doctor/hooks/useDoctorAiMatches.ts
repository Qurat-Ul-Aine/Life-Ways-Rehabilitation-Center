import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { recommendationService } from "@/features/recommendation/services/recommendationService";
import type {
  DoctorAiMatchDetail,
  DoctorAiMatchesResponse,
  DoctorAiMatchNotesPayload,
} from "../types/doctor-ai-matches.types";

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

export function useDoctorAiMatches() {
  const [data, setData] = useState<DoctorAiMatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getDoctorMatches();
      setData(result);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load AI matches."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useDoctorAiMatchDetail(recommendationId: string | null) {
  const [detail, setDetail] = useState<DoctorAiMatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!recommendationId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getDoctorMatchDetail(recommendationId);
      setDetail(result);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load patient assessment."));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [recommendationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotes = useCallback(
    async (payload: DoctorAiMatchNotesPayload) => {
      if (!recommendationId) return null;

      setSaving(true);
      setError(null);
      try {
        const notes = await recommendationService.updateDoctorMatchNotes(
          recommendationId,
          payload,
        );
        setDetail((current) => (current ? { ...current, notes } : current));
        return notes;
      } catch (err) {
        const message = toErrorMessage(err, "Failed to save notes.");
        setError(message);
        throw new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [recommendationId],
  );

  return { detail, loading, error, saving, reload: load, saveNotes };
}
