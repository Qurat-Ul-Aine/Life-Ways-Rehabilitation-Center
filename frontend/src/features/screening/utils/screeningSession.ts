import type { ScreeningSession } from "@/features/screening/types/screening.types";

const KEY = "lifeways_screening_session";

export function getScreeningSession(): ScreeningSession {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScreeningSession) : {};
  } catch {
    return {};
  }
}

export function setScreeningSession(patch: Partial<ScreeningSession>) {
  const next = { ...getScreeningSession(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearScreeningSession() {
  sessionStorage.removeItem(KEY);
}
