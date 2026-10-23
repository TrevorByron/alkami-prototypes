// Called by Prototyping in Mantl (myfintech/prototyping-in-mantl, workflow
// publish-site.yml) every time a prototype is published or archived there.
// It upserts one row in public.prototypes per shared branch so the prototype
// appears in the library with comments, replies, upvotes and attachments.
//
// This is a server-to-server call, not a signed-in member: it is authorised by
// a shared secret (MANTL_REGISTER_SECRET) and must be deployed with
// --no-verify-jwt. Rows are owned by a service account, created on first use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { json } from "../_shared/auth.ts";

type Payload = {
  name: string;
  title: string;
  author: string;
  branch: string;
  commit: string;
  previewUrl: string;
  galleryUrl: string;
  codeUrl: string;
  handoffUrl: string | null;
  pages: number;
  archived: boolean;
};

const BOT_EMAIL = (Deno.env.get("MANTL_BOT_EMAIL") ?? "prototyping-in-mantl@alkami.com").trim().toLowerCase();
const BOT_NAME = "Prototyping in Mantl";
// The library's viewer shows its sign-in card for this prefix (ViewerPage.tsx,
// needsSignIn): the Pages site is private to the GitHub organisation.
const EMBED_REASON = "This URL requires sign-in to GitHub (the preview is on a private GitHub Pages site). If the frame stays blank after signing in, open it in a new tab.";

function timingSafeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function httpsUrl(value: unknown) {
  const candidate = text(value, 2000);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parse(body: unknown): Payload | string {
  const input = (body ?? {}) as Record<string, unknown>;
  const name = text(input.name, 60);
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(name)) return "name must be a lowercase slug";
  const branch = text(input.branch, 120);
  if (!branch.startsWith("proto/")) return "branch must start with proto/";
  const previewUrl = httpsUrl(input.previewUrl);
  const galleryUrl = httpsUrl(input.galleryUrl);
  const codeUrl = httpsUrl(input.codeUrl);
  if (!previewUrl || !galleryUrl || !codeUrl) return "previewUrl, galleryUrl and codeUrl must be https addresses";
  const author = text(input.author, 80) || "Unknown";
  return {
    name,
    title: text(input.title, 120) || name,
    author,
    branch,
    commit: text(input.commit, 40),
    previewUrl,
    galleryUrl,
    codeUrl,
    handoffUrl: httpsUrl(input.handoffUrl),
    pages: Number.isFinite(Number(input.pages)) ? Math.max(0, Math.floor(Number(input.pages))) : 0,
    archived: input.archived === true,
  };
}

// The service account that owns registered rows. created_by must be an auth
// user; creating it here runs the same profile trigger as a real sign-in.
async function botUserId(admin: ReturnType<typeof createClient>) {
  const { data: profile } = await admin.from("profiles").select("id").eq("email", BOT_EMAIL).maybeSingle();
  if (profile?.id) return profile.id as string;
  const { data, error } = await admin.auth.admin.createUser({ email: BOT_EMAIL, email_confirm: true, user_metadata: { name: BOT_NAME } });
  if (error || !data.user) throw new Error(`Could not create the service account: ${error?.message ?? "unknown error"}`);
  return data.user.id;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = Deno.env.get("MANTL_REGISTER_SECRET") ?? "";
  const provided = request.headers.get("x-register-secret") ?? "";
  if (!secret || !provided || !timingSafeEqual(secret, provided)) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase is not configured" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let payload: Payload | string;
  try {
    payload = parse(await request.json());
  } catch {
    payload = "body must be JSON";
  }
  if (typeof payload === "string") return json({ error: payload }, 400);

  try {
    const description = [
      `Shared from Prototyping in Mantl by ${payload.author}.`,
      payload.pages ? `${payload.pages} recorded page${payload.pages === 1 ? "" : "s"}.` : null,
      "Pages open and interact; nothing saves.",
    ].filter(Boolean).join(" ");
    const fields = {
      name: payload.title,
      url: payload.previewUrl,
      description,
      owner_name: payload.author,
      embed_mode: "live",
      embed_reason: EMBED_REASON,
      favicon_url: null,
      source: "mantl",
      source_key: payload.branch,
      source_meta: {
        name: payload.name,
        branch: payload.branch,
        commit: payload.commit,
        author: payload.author,
        gallery_url: payload.galleryUrl,
        code_url: payload.codeUrl,
        handoff_url: payload.handoffUrl,
        pages: payload.pages,
        registered_at: new Date().toISOString(),
      },
      archived_at: payload.archived ? new Date().toISOString() : null,
    };

    const { data: existing, error: lookupError } = await admin
      .from("prototypes")
      .select("id, archived_at")
      .eq("source", "mantl")
      .eq("source_key", payload.branch)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let id: string;
    if (existing) {
      // Keep the original archive time if it is being archived again.
      const archivedAt = payload.archived ? existing.archived_at ?? fields.archived_at : null;
      const { error } = await admin.from("prototypes").update({ ...fields, archived_at: archivedAt }).eq("id", existing.id);
      if (error) throw error;
      id = existing.id as string;
    } else {
      const createdBy = await botUserId(admin);
      const { data, error } = await admin
        .from("prototypes")
        .insert({ ...fields, owner_id: null, owner_slack_id: null, slack_channel_id: null, slack_channel_name: null, tags: ["exploratory"], created_by: createdBy })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("insert returned no row");
      id = data.id as string;
    }

    const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
    return json({ ok: true, id, created: !existing, archived: payload.archived, url: appUrl ? `${appUrl}/#/p/${id}` : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
