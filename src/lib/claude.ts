// Claude artifacts refuse to be framed by any other site (frame-ancestors
// 'self'), so they always open on claude.ai. Published ones live under
// /public/ and need no account; anything else needs a Claude sign-in with access.
export function claudeArtifact(url: string): { access: "public" | "invited" } | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "claude.ai" && !hostname.endsWith(".claude.ai")) return null;
    return { access: pathname.startsWith("/public/") ? "public" : "invited" };
  } catch {
    return null;
  }
}
