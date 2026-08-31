import { ASSIGNABLE_ROLES, ROLE_LABELS, normalizeAppRole, roleAllows } from "./rbac";

export const getUserHomeRoute = (role: string): string => {
  const r = normalizeAppRole(role);
  if (r === "admin") return "/admin/dashboard";
  if (r === "doctor") return "/doctor/dashboard";
  if (r === "patient" || r === "family") return "/patient/dashboard/home";
  if (r === "staff") return "/staff/dashboard";
  return "/";
};

export const canAccess = (userRole: string, allowedRoles: string[]): boolean =>
  roleAllows(userRole, allowedRoles);

export const getRoleBadgeColor = (role: string): string => {
  const r = normalizeAppRole(role);
  if (r === "admin") return "bg-red-100 text-red-700";
  if (r === "doctor") return "bg-blue-100 text-blue-700";
  if (r === "patient") return "bg-emerald-100 text-emerald-700";
  if (r === "family") return "bg-violet-100 text-violet-700";
  if (r === "staff") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
};

export { ASSIGNABLE_ROLES, ROLE_LABELS, normalizeAppRole };
