/** Normalize reset token from email links (mobile clients may wrap or encode URLs). */
export function normalizeResetToken(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let token = raw.trim();
  if (!token) return null;

  try {
    token = decodeURIComponent(token);
  } catch {
    // Keep raw token if decoding fails.
  }

  token = token.trim();

  // Some mobile mail apps append punctuation when auto-linking.
  token = token.replace(/[.,)>\]}"']+$/, "");

  return /^[a-f0-9]{32,128}$/i.test(token) ? token : null;
}

/** Read token from /reset-password?token=… or /reset-password/:token */
export function readResetTokenFromLocation(
  pathToken: string | undefined,
  searchParams: URLSearchParams,
): string | null {
  const fromQuery = normalizeResetToken(searchParams.get("token"));
  if (fromQuery) return fromQuery;

  return normalizeResetToken(pathToken);
}
