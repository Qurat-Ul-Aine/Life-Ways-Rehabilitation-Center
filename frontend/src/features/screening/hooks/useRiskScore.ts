import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getResult } from "@/features/screening/services/screeningService";
import { clearScreeningSession } from "@/features/screening/utils/screeningSession";
import { formatResultAdvice, isHighRisk, isLowRisk } from "@/features/screening/utils/risk";
import type { ScreeningResult } from "@/features/screening/types/screening.types";

export function useRiskScore() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getResult(id)
      .then((data) => {
        setResult(data);
        clearScreeningSession();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load result."))
      .finally(() => setLoading(false));
  }, [id]);

  return {
    result,
    loading,
    error,
    advice: result ? formatResultAdvice(result) : null,
    isHighRisk: result ? isHighRisk(result.riskLevel) : false,
    isLowRisk: result ? isLowRisk(result.riskLevel) : false,
  };
}
