import { corsHeaders, json, requireAlkamiMember } from "../_shared/auth.ts";

type EmbedResult = {
  embeddable: boolean;
  reason: string;
  final_url: string;
  title: string | null;
  favicon_url: string | null;
  requires_sign_in: boolean;
};

function response(result: EmbedResult) {
  return json(result);
}

function identityHost(host: string) {
  return /(gitlab\.com|okta|microsoftonline|auth0|(^|\.)login\.|(^|\.)sso\.)/i.test(host);
}

function getTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function getFavicon(html: string, finalUrl: string) {
  const match = html.match(/<link[^>]+(?:rel=["'][^"']*icon[^"']*["'][^>]*href|href=["'][^"']+["'][^>]*rel=["'][^"']*icon[^"']*["'])[^>]*>/i);
  const href = match?.[0]?.match(/href=["']([^"']+)["']/i)?.[1];
  if (!href) return new URL("/favicon.ico", finalUrl).toString();
  try { return new URL(href, finalUrl).toString(); } catch { return null; }
}

function cspAllows(csp: string | null, appOrigin: string, finalOrigin: string) {
  const directive = csp?.split(";").map((part) => part.trim()).find((part) => part.toLowerCase().startsWith("frame-ancestors"));
  if (!directive) return true;
  const sources = directive.split(/\s+/).slice(1);
  if (sources.includes("'none'")) return false;
  if (sources.includes("*")) return true;
  return sources.some((source) => {
    const normalized = source.replace(/^'|'$/g, "");
    if (normalized === "self") return appOrigin === finalOrigin;
    if (normalized === appOrigin) return true;
    if (normalized.endsWith(":")) return appOrigin.startsWith(normalized);
    return false;
  });
}

function xFrameAllows(value: string | null, appOrigin: string, finalOrigin: string) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === "deny") return false;
  if (normalized === "sameorigin") return appOrigin === finalOrigin;
  if (normalized.startsWith("allow-from")) return normalized.includes(appOrigin.toLowerCase());
  return true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAlkamiMember(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json() as { url?: string };
    const input = body.url?.trim() ?? "";
    const requestedUrl = new URL(input);
    if (!/^https?:$/.test(requestedUrl.protocol)) return json({ error: "Only HTTP and HTTPS URLs are supported." }, 400);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let page: Response;
    try {
      page = await fetch(requestedUrl, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Alkami-Commentor/1.0" } });
    } finally {
      clearTimeout(timeout);
    }

    const finalUrl = page.url || requestedUrl.toString();
    const final = new URL(finalUrl);
    const appOrigin = Deno.env.get("APP_ORIGIN")?.replace(/\/$/, "") ?? "";
    const finalOrigin = final.origin;
    const html = (page.headers.get("content-type") ?? "").includes("text/html") ? (await page.text()).slice(0, 500_000) : "";
    const xFrame = page.headers.get("x-frame-options");
    const csp = page.headers.get("content-security-policy");
    const allowedByHeaders = xFrameAllows(xFrame, appOrigin, finalOrigin) && cspAllows(csp, appOrigin, finalOrigin);
    const requiresSignIn = final.host !== requestedUrl.host && identityHost(final.host);
    // The checker cannot carry the user's SSO cookies, so an unauthenticated
    // probe may see the identity provider instead of the actual prototype.
    // Let the browser try the live frame; the viewer still exposes a new-tab
    // fallback if the provider blocks the iframe.
    const embeddable = page.ok && (allowedByHeaders || requiresSignIn);
    const reason = !page.ok ? `The site returned HTTP ${page.status}.` : requiresSignIn ? "This URL requires sign-in. Open it in a new tab to authenticate." : !allowedByHeaders ? "This site prevents embedding in another application." : "The site allows embedding.";

    return response({ embeddable, reason, final_url: finalUrl, title: getTitle(html), favicon_url: html ? getFavicon(html, finalUrl) : new URL("/favicon.ico", finalUrl).toString(), requires_sign_in: requiresSignIn });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "The URL took too long to respond." : "We could not reach this URL.";
    return response({ embeddable: false, reason: message, final_url: "", title: null, favicon_url: null, requires_sign_in: false });
  }
});
