import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/api";

const decodeTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 <= Date.now();
};

export const getRoleFromToken = (token: string): string | null => {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  const role = payload.role;
  return typeof role === "string" ? role : null;
};

export const getStoredToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
