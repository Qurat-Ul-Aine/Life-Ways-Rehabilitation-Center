const LABELED_PREFIXES = [
  "Medical history:",
  "Current medications:",
  "Allergies:",
  "Location:",
  "Preferred consultation:",
  "Preferred doctor gender:",
  "Preferred language:",
];

/** Extract patient-reported symptoms from a persisted symptoms blob. */
export function formatSymptomsDisplay(symptoms?: string | null): string {
  if (!symptoms?.trim()) return "Not provided";

  let text = symptoms.trim();
  text = text.replace(/\.\s*recovery_progress:[^.]*/gi, "").trim();

  for (const prefix of LABELED_PREFIXES) {
    const index = text.indexOf(prefix);
    if (index > 0) {
      text = text.slice(0, index).trim().replace(/\.\s*$/, "");
      break;
    }
    if (index === 0) return "Not provided";
  }

  return text || "Not provided";
}

export function formatMedicalHistoryDisplay(
  summary?: string | null,
  symptomsBlob?: string | null,
): string {
  if (summary?.trim()) return summary.trim();

  const text = symptomsBlob ?? "";
  const match = text.match(/Medical history:\s*([^.]+(?:\.\s+[^A-Z][^.]+)*)/i);
  return match?.[1]?.trim() || "Not provided";
}
