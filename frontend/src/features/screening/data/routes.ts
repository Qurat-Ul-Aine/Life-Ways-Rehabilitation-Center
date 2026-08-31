/** Public screening flow routes */
export const SCREENING_ROUTES = {
  intro: "/screening/intro",
  basicInfo: "/screening/basic-info",
  conditions: "/screening/conditions",
  assessmentType: "/screening/assessment-type",
  questions: "/screening/questions",
  result: (id: string) => `/screening/result/${id}`,
} as const;
