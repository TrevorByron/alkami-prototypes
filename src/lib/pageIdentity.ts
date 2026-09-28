export const navigationMessageType = "commentor:navigation";

/**
 * A comment belongs to a route within a prototype, not just to the prototype
 * record. Keep the origin in the identity so two hosted pages cannot collide,
 * while preserving path, query string, and hash routes for SPAs.
 */
export function normalizePageUrl(value: string | null | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  try {
    const url = new URL(candidate, fallback);
    return `${url.origin}${url.pathname || "/"}${url.search}${url.hash}`;
  } catch {
    return candidate;
  }
}
