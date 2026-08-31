export type DoctorGenderOption = "" | "male" | "female" | "other";

export interface DoctorGenderFormState {
  gender: DoctorGenderOption;
  genderOther: string;
}

const STANDARD_GENDERS = new Set(["male", "female"]);

export function parseDoctorGenderForForm(
  stored?: string | null,
): DoctorGenderFormState {
  if (!stored?.trim()) {
    return { gender: "", genderOther: "" };
  }
  const normalized = stored.trim().toLowerCase();
  if (normalized === "male" || normalized === "female") {
    return { gender: normalized, genderOther: "" };
  }
  if (normalized === "other") {
    return { gender: "other", genderOther: "" };
  }
  return { gender: "other", genderOther: stored.trim() };
}

export function resolveDoctorGenderFromForm(
  gender: DoctorGenderOption,
  genderOther: string,
): string | null {
  if (!gender) return null;
  if (gender === "other") {
    const custom = genderOther.trim();
    return custom || null;
  }
  return gender;
}

export function formatDoctorGender(value?: string | null): string {
  if (!value?.trim()) return "—";
  const normalized = value.trim().toLowerCase();
  if (STANDARD_GENDERS.has(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return value.trim();
}
