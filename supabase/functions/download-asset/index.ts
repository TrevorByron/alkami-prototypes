// Hands a signed-in member a download link for a file on the Prototyping in
// MANTL releases: the template zip, or the "Build on this" copy of a prototype.
//
// The repository is internal to the GitHub organisation, so its release
// assets answer "Not Found" to a browser that is not signed in there. Members
// of this library are signed in here, by their work email, not necessarily
// on GitHub. So the library asks this function, which holds a read-only GitHub
// token (GITHUB_ASSET_TOKEN), and GitHub answers with a short-lived signed
// link to the file itself. The browser downloads from that link directly;
// nothing streams through here, and the link stops working minutes later.
import { corsHeaders, json, requireAlkamiMember } from "../_shared/auth.ts";

const REPOSITORY = (Deno.env.get("MANTL_REPOSITORY") ?? "myfintech/prototyping-in-mantl").trim();
const TEMPLATE = { tag: "latest", name: "prototyping-in-mantl.zip" };
const COPIES_TAG = "start-from";

type Asset = { id: number; name: string; size: number };

// "template", or the file name of a copy such as "dark-mode.zip".
function resolve(asset: unknown): { tag: string; name: string } | null {
  if (asset === "template") return TEMPLATE;
  if (typeof asset === "string" && /^[a-z0-9][a-z0-9-]{0,59}\.zip$/.test(asset)) return { tag: COPIES_TAG, name: asset };
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = await requireAlkamiMember(request);
  if (auth instanceof Response) return auth;

  const token = Deno.env.get("GITHUB_ASSET_TOKEN")?.trim();
  if (!token) return json({ error: "Downloads are not set up here yet (no GITHUB_ASSET_TOKEN)." }, 503);

  let wanted: ReturnType<typeof resolve> = null;
  try {
    wanted = resolve(((await request.json()) as { asset?: unknown })?.asset);
  } catch {
    wanted = null;
  }
  if (!wanted) return json({ error: "Say which file: \"template\" or \"<prototype>.zip\"." }, 400);

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "alkami-prototypes" };
  const release = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/tags/${wanted.tag}`, { headers });
  if (release.status === 404) return json({ error: "There is no such download yet." }, 404);
  if (!release.ok) return json({ error: `GitHub refused the release lookup (HTTP ${release.status}).` }, 502);
  const assets = ((await release.json()) as { assets?: Asset[] }).assets ?? [];
  const found = assets.find((candidate) => candidate.name === wanted.name);
  if (!found) return json({ error: "There is no such download yet. If the prototype was just shared, try again in a few minutes." }, 404);

  // Asked for the bytes, GitHub redirects to a signed, time-limited link.
  const located = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/assets/${found.id}`, {
    headers: { ...headers, Accept: "application/octet-stream" },
    redirect: "manual",
  });
  const url = located.headers.get("location");
  if (located.status < 300 || located.status >= 400 || !url) return json({ error: `GitHub did not hand out a download link (HTTP ${located.status}).` }, 502);
  return json({ url, name: found.name, size: found.size });
});
