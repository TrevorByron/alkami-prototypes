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
//
// MANTL: previews published from Prototyping in MANTL (the shared GitHub
// repository, one branch per prototype) live on a private GitHub Pages site,
// which only opens in its own tab (opensInNewTabOnly below).
export type PlatformId = "claude" | "replit" | "mantl";

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

  if (host.endsWith(".pages.github.io")) {
    return { id: "mantl", name: "MANTL", external: false, access: "restricted", subtitle: "Prototyping in MANTL" };
  }

  if (/(^|\.)(replit\.app|replit\.dev|repl\.co|replit\.com)$/.test(host)) {
    const external = embedMode === "new_tab";
    return { id: "replit", name: "Replit", external, access: external ? "restricted" : "public", subtitle: external ? "Private Replit app" : "Replit app" };
  }

  return null;
}

// Prototypes that are only ever opened in their own tab, never framed or
// discussed here: everything from Prototyping in MANTL and any other private
// GitHub Pages site. GitHub's sign-in for private Pages only works in a full
// tab, so the viewer can't show them; the library offers the site, its
// handoff notes and its code instead.
export function opensInNewTabOnly(prototype: { url: string; source?: string | null }) {
  if (prototype.source === "mantl") return true;
  try { return new URL(prototype.url).hostname.endsWith(".pages.github.io"); } catch { return false; }
}
