import { PASSWORD_REGEX } from "./passwordPolicy";

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z\d]/.test(password)) score += 1;

  if (PASSWORD_REGEX.test(password) && score >= 5) return "strong";
  if (score >= 4) return "good";
  if (score >= 2) return "fair";
  return "weak";
}

export const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  empty: "",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

export const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  empty: "bg-muted",
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500",
};

export const STRENGTH_SEGMENTS: Record<PasswordStrength, number> = {
  empty: 0,
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
};
