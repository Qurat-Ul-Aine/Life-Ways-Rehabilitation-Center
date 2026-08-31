import { getScreeningSession } from "./screeningSession";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";

/** True when the patient has an in-progress screening session in sessionStorage. */
export function hasPendingScreeningSession(): boolean {
  const session = getScreeningSession();
  return Boolean(
    session.assessmentType || session.conditionId || session.age || session.gender
  );
}

/** Resolves the next step route for a saved in-progress screening session. */
export function getContinueScreeningRoute(): string {
  const session = getScreeningSession();
  if (session.conditionId && session.assessmentType) {
    return SCREENING_ROUTES.questions;
  }
  if (session.age && session.gender && session.assessmentType) {
    return SCREENING_ROUTES.conditions;
  }
  if (session.assessmentType) {
    return SCREENING_ROUTES.basicInfo;
  }
  return SCREENING_ROUTES.assessmentType;
}

export function getPendingScreeningLabel(): string {
  const session = getScreeningSession();
  if (session.conditionId) return "Continue your questionnaire";
  if (session.age && session.gender) return "Continue condition selection";
  if (session.assessmentType) return "Continue basic information";
  return "Continue your assessment";
}
