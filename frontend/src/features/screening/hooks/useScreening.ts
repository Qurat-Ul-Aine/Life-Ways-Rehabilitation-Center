import { useEffect, useState } from "react";
import { getIntroConfig } from "@/features/screening/services/screeningService";
import type { ScreeningIntroConfig } from "@/features/screening/types/screening.types";

export function useScreening() {
  const [config, setConfig] = useState<ScreeningIntroConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIntroConfig()
      .then((data) => {
        if (!data) {
          setError("Screening is not configured. Please contact support.");
          return;
        }
        setConfig(data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load screening information.")
      )
      .finally(() => setLoading(false));
  }, []);

  return { config, loading, error };
}
