/** Public internship information */
export const INTERNSHIPS_PUBLIC = "/internships";

/** Intern auth & portal */
export const INTERN_AUTH = {
  login: "/intern/login",
  signup: "/intern/signup",
  dashboard: "/intern/dashboard",
  overview: "/intern/dashboard/overview",
  profile: "/intern/dashboard/profile",
  attendance: "/intern/dashboard/attendance",
  logs: "/intern/dashboard/training-logs",
  progress: "/intern/dashboard/progress",
  notifications: "/intern/dashboard/notifications",
  mentor: "/intern/dashboard/mentor",
} as const;

/** Admin intern management (SRS) */
export const INTERN_ADMIN_BASE = "/admin/interns";

export const internAdminRoutes = {
  list: INTERN_ADMIN_BASE,
  create: `${INTERN_ADMIN_BASE}/create`,
  detail: (id: string) => `${INTERN_ADMIN_BASE}/${id}`,
  edit: (id: string) => `${INTERN_ADMIN_BASE}/${id}/edit`,
} as const;
