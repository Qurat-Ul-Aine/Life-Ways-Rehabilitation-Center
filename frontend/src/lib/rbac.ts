/**
 * Frontend RBAC mirror of backend access policies (SRS-22, SRS-23).
 */

export type AppRole = "admin" | "doctor" | "patient" | "staff" | "family" | "intern";

export const APP_ROLES: AppRole[] = ["admin", "doctor", "patient", "staff", "family", "intern"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  patient: "Patient",
  staff: "Staff",
  family: "Family member",
  intern: "Intern",
};

const PATIENT_PORTAL_ROLES: AppRole[] = ["patient", "family"];

export function normalizeAppRole(role: string): AppRole {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "intern") return "intern";
  return (APP_ROLES as readonly string[]).includes(r) ? (r as AppRole) : "patient";
}

export function canUsePatientPortal(role: string): boolean {
  return PATIENT_PORTAL_ROLES.includes(normalizeAppRole(role));
}

export function canAccessAdminPortal(role: string): boolean {
  return normalizeAppRole(role) === "admin";
}

export function canAccessDoctorPortal(role: string): boolean {
  return normalizeAppRole(role) === "doctor";
}

/** Route prefixes each role may access. */
const ROUTE_ACCESS: Record<AppRole, string[]> = {
  admin: ["/admin"],
  doctor: ["/doctor"],
  patient: ["/patient"],
  family: ["/patient"],
  staff: ["/staff"],
  intern: ["/intern"],
};

export function canAccessRoute(role: string, pathname: string): boolean {
  const norm = normalizeAppRole(role);
  const prefixes = ROUTE_ACCESS[norm] ?? [];
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export function roleAllows(userRole: string, allowedRoles: string[]): boolean {
  const norm = normalizeAppRole(userRole);
  return allowedRoles.map((r) => normalizeAppRole(r)).includes(norm);
}

export function canAccessInternPortal(role: string): boolean {
  return normalizeAppRole(role) === "intern";
}

export const ASSIGNABLE_ROLES: AppRole[] = ["patient", "doctor", "staff", "family", "admin"];
