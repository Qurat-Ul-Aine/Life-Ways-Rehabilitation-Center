/** Turn a relative `/uploads/...` path into a full URL for img src. */
export function resolveUploadUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const apiBase = import.meta.env.VITE_API_URL ?? "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
