import { corsHeaders, json, requireAlkamiMember } from "../_shared/auth.ts";

type Directory = { users: Array<{ id: string; name: string; avatar_url: string | null }>; channels: Array<{ id: string; name: string; is_private: boolean }> };
let cache: { expiresAt: number; value: Directory } | null = null;

async function slackGet(token: string, method: string, params: Record<string, string>) {
  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const result = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await result.json() as { ok?: boolean; error?: string; response_metadata?: { next_cursor?: string } } & Record<string, unknown>;
  if (!data.ok) throw new Error(data.error ?? `Slack ${method} failed`);
  return data;
}

async function listUsers(token: string) {
  const users: Directory["users"] = [];
  let cursor = "";
  do {
    const data = await slackGet(token, "users.list", { limit: "200", ...(cursor ? { cursor } : {}) }) as { members?: Array<{ id: string; name: string; real_name?: string; deleted?: boolean; profile?: { display_name?: string; image_72?: string } }>; response_metadata?: { next_cursor?: string } };
    for (const user of data.members ?? []) {
      if (!user.deleted && user.id) users.push({ id: user.id, name: user.profile?.display_name || user.real_name || user.name, avatar_url: user.profile?.image_72 ?? null });
    }
    cursor = data.response_metadata?.next_cursor ?? "";
  } while (cursor);
  return users.sort((a, b) => a.name.localeCompare(b.name));
}

async function listChannels(token: string) {
  const channels: Directory["channels"] = [];
  let cursor = "";
  do {
    const data = await slackGet(token, "conversations.list", { limit: "200", types: "public_channel,private_channel", exclude_archived: "true", ...(cursor ? { cursor } : {}) }) as { channels?: Array<{ id: string; name: string; is_private?: boolean; is_member?: boolean }>; response_metadata?: { next_cursor?: string } };
    for (const channel of data.channels ?? []) {
      if (channel.id && (!channel.is_private || channel.is_member)) channels.push({ id: channel.id, name: channel.name, is_private: Boolean(channel.is_private) });
    }
    cursor = data.response_metadata?.next_cursor ?? "";
  } while (cursor);
  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAlkamiMember(request);
  if (auth instanceof Response) return auth;
  if (cache && cache.expiresAt > Date.now()) return json(cache.value);

  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return json({ error: "Slack directory is not configured." }, 500);
  try {
    const [users, channels] = await Promise.all([listUsers(token), listChannels(token)]);
    const value = { users, channels };
    cache = { expiresAt: Date.now() + 10 * 60 * 1000, value };
    return json(value);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Slack directory is unavailable." }, 502);
  }
});
