/** Admin dashboard screening routes */
export const ADMIN_SCREENING_ROUTES = {
  list: "/admin/screening",
  highRisk: "/admin/screening/high-risk",
  detail: (id: string) => `/admin/screening/${id}`,
  analytics: "/admin/screening/analytics",
} as const;
