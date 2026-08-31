const BLOCKED_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }

  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }

  return path;
}

export function buildLoginPath(loginPath: string, returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return loginPath;
  return `${loginPath}?returnTo=${encodeURIComponent(safe)}`;
}

export function getPostLoginPath(role: string, returnTo?: string | null): string {
  const normalized = role.toLowerCase();
  const safe = sanitizeReturnTo(returnTo);

  if (normalized === "patient" || normalized === "family" || normalized === "user") {
    return safe ?? "/";
  }
  if (normalized === "admin") return "/admin/dashboard";
  if (normalized === "doctor") return "/doctor/dashboard";
  if (normalized === "staff") return "/staff/dashboard";

  return safe ?? "/";
}
