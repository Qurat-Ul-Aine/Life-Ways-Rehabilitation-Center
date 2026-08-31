export const APPOINTMENT_REASON_OPTIONS = [
  { value: "injury", label: "Injury" },
  { value: "follow-up", label: "Follow-up" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
] as const;

export type AppointmentReasonOption =
  (typeof APPOINTMENT_REASON_OPTIONS)[number]["value"];

export function formatAppointmentReason(
  option: AppointmentReasonOption | "",
  otherText = "",
): string {
  if (!option) return "";
  if (option === "other") return otherText.trim();
  const match = APPOINTMENT_REASON_OPTIONS.find((item) => item.value === option);
  return match?.label ?? option;
}

export function validateAppointmentReason(
  option: AppointmentReasonOption | "",
  otherText = "",
): string | null {
  if (!option) return "Please select a reason for your visit.";
  if (option === "other" && !otherText.trim()) {
    return "Please specify your reason for visit.";
  }
  return null;
}

export function parseAppointmentReason(
  reason: string | null | undefined,
): { option: AppointmentReasonOption | ""; otherText: string } {
  const text = String(reason ?? "").trim();
  if (!text) return { option: "", otherText: "" };

  const exact = APPOINTMENT_REASON_OPTIONS.find(
    (item) => item.label.toLowerCase() === text.toLowerCase(),
  );
  if (exact) return { option: exact.value, otherText: "" };

  const lower = text.toLowerCase();
  if (lower.startsWith("other:")) {
    return { option: "other", otherText: text.slice(6).trim() };
  }
  if (lower.startsWith("other (")) {
    return { option: "other", otherText: text.replace(/^other\s*\(/i, "").replace(/\)\s*$/, "").trim() };
  }

  return { option: "other", otherText: text };
}
