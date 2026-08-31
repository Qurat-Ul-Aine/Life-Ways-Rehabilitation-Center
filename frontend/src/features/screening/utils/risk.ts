import type { RiskLevel, ScreeningResult } from "@/features/screening/types/screening.types";

export function riskBadgeVariant(risk: RiskLevel | string | null) {
  if (risk === "high") return "destructive" as const;
  if (risk === "moderate") return "secondary" as const;
  return "default" as const;
}

export function riskLabel(risk: RiskLevel | string | null): string {
  if (risk === "moderate") return "Moderate Risk";
  if (risk === "high") return "High Risk";
  return "Low Risk";
}

export function isHighRisk(risk: RiskLevel | string | null): boolean {
  return risk === "high";
}

export function isLowRisk(risk: RiskLevel | string | null): boolean {
  return risk === "low";
}

export function formatResultAdvice(result: ScreeningResult): string | null {
  return result.description ?? result.explanation;
}
