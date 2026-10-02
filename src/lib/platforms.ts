import type { EmbedMode } from "@/lib/types";

// Prototyping tools that get their own branded treatment.
//
// Claude: claude.ai refuses to be framed by other sites (frame-ancestors
// 'self'), so artifacts always open on claude.ai. Published ones live under
// /public/ and need no account.
//
// Replit: public deployments usually frame fine and keep the live preview.
// Private deployments bounce visitors to Replit sign-in (X-Frame-Options:
// DENY), which check-embed records as new_tab.
export type PlatformId = "claude" | "replit";

export type Platform = {
  id: PlatformId;
  name: string;
  /** Opens on the tool's own site instead of in the frame. */
  external: boolean;
  /** Anyone with the link can open it, or only people with access. */
  access: "public" | "restricted";
  subtitle: string;
};

export function detectPlatform(url: string, embedMode: EmbedMode): Platform | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname;

  if (host === "claude.ai" || host.endsWith(".claude.ai")) {
    const isPublic = parsed.pathname.startsWith("/public/");
    return { id: "claude", name: "Claude", external: true, access: isPublic ? "public" : "restricted", subtitle: isPublic ? "Published on claude.ai" : "Shared on claude.ai" };
  }

  if (/(^|\.)(replit\.app|replit\.dev|repl\.co|replit\.com)$/.test(host)) {
    const external = embedMode === "new_tab";
    return { id: "replit", name: "Replit", external, access: external ? "restricted" : "public", subtitle: external ? "Private Replit app" : "Replit app" };
  }

  return null;
}
