const FACTOR_LABELS: Record<string, string> = {
  specialization_match: "Specialization matches your clinical needs",
  qualification_match: "Qualifications align with your condition",
  service_match: "Offers relevant rehabilitation services",
  success_rate: "Strong patient success rate",
  rating: "Highly rated by patients",
  experience: "Extensive clinical experience",
  workload_adjusted: "Availability adjusted for current caseload",
  gender_preference_match: "Matches your preferred doctor gender",
  gender_fallback: "Recommended as the best clinical match for your condition",
};

export function formatRankingFactor(factor: string): string {
  return FACTOR_LABELS[factor] ?? factor.replace(/_/g, " ");
}

export function formatRankLabel(rank: number): string {
  if (rank === 1) return "Best match";
  if (rank === 2) return "2nd choice";
  if (rank === 3) return "3rd choice";
  return `${rank}th choice`;
}

export function formatAvailability(
  availability: string | null | undefined,
): { label: string; variant: "available" | "unavailable" } {
  const value = String(availability ?? "").toUpperCase();
  if (value === "AVAILABLE") {
    return { label: "Available", variant: "available" };
  }
  return { label: "Unavailable", variant: "unavailable" };
}
