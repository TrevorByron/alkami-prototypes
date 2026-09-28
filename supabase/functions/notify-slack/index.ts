import { corsHeaders, json, requireAlkamiMember } from "../_shared/auth.ts";

type NotificationType = "comment" | "reply" | "resolved" | "reopened";

async function slackApi(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { ok?: boolean; error?: string; ts?: string };
  if (!response.ok || !result.ok) throw new Error(result.error ?? `Slack ${method} failed`);
  return result;
}

function quote(body: string) {
  return body.split("\n").map((line) => `>${line}`).join("\n");
}

function deepLink(prototypeId: string, commentId: string) {
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/$/, "");
  if (!appUrl) throw new Error("APP_URL is not configured");
  return `${appUrl}/#/p/${prototypeId}?comment=${commentId}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAlkamiMember(request);
  if (auth instanceof Response) return auth;

  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return json({ error: "Slack notifications are not configured." }, 500);

  try {
    const body = await request.json() as { type?: NotificationType; id?: string };
    if (!body.id || !body.type || !["comment", "reply", "resolved", "reopened"].includes(body.type)) return json({ error: "type and id are required" }, 400);

    const { data: comment, error: commentError } = await auth.admin.from("comments").select("*").eq("id", body.type === "reply" ? "00000000-0000-0000-0000-000000000000" : body.id).maybeSingle();
    if (body.type !== "reply" && (commentError || !comment)) return json({ error: "Comment not found" }, 404);

    if (body.type === "comment" || body.type === "resolved" || body.type === "reopened") {
      const target = comment!;
      const [{ data: prototype }, { data: author }, { data: resolver }] = await Promise.all([
        auth.admin.from("prototypes").select("id, name, slack_channel_id, owner_slack_id").eq("id", target.prototype_id).single(),
        auth.admin.from("profiles").select("name, slack_user_id").eq("id", target.author_id).single(),
        target.resolved_by ? auth.admin.from("profiles").select("name").eq("id", target.resolved_by).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (!prototype || !author) return json({ error: "Notification data is incomplete" }, 422);
      if (!prototype.slack_channel_id) return json({ error: "Slack is not connected for this prototype." }, 409);
      const link = deepLink(prototype.id, target.id);
      const ownerMention = prototype.owner_slack_id ? `<@${prototype.owner_slack_id}>` : "Prototype owner";
      if (body.type === "comment") {
        const result = await slackApi(token, "chat.postMessage", { channel: prototype.slack_channel_id, text: `${ownerMention} — ${author.name} commented on *${prototype.name}* · ${target.screen_label ?? "General comment"}\n${quote(target.body)}\n<${link}|View pin →>` });
        await auth.admin.from("comments").update({ slack_ts: result.ts }).eq("id", target.id);
        return json({ ok: true, ts: result.ts });
      }
      if (!target.slack_ts) return json({ error: "The parent Slack message has not been created yet." }, 409);
      const resolverName = resolver?.name ?? author.name;
      const message = body.type === "resolved" ? `✅ Resolved by ${resolverName}: ${target.resolution_note ?? ""}`.trim() : `↩️ Reopened by ${resolverName}`;
      await slackApi(token, "chat.postMessage", { channel: prototype.slack_channel_id, thread_ts: target.slack_ts, text: message });
      if (body.type === "resolved") await slackApi(token, "reactions.add", { channel: prototype.slack_channel_id, timestamp: target.slack_ts, name: "white_check_mark" });
      return json({ ok: true });
    }

    const { data: reply, error: replyError } = await auth.admin.from("replies").select("*").eq("id", body.id).single();
    if (replyError || !reply) return json({ error: "Reply not found" }, 404);
    const { data: parent } = await auth.admin.from("comments").select("id, prototype_id, slack_ts, author_id").eq("id", reply.comment_id).single();
    if (!parent) return json({ error: "Parent comment not found" }, 404);
    const [{ data: prototype }, { data: author }, { data: replyAuthor }] = await Promise.all([
      auth.admin.from("prototypes").select("id, name, slack_channel_id").eq("id", parent.prototype_id).single(),
      auth.admin.from("profiles").select("slack_user_id").eq("id", parent.author_id).single(),
      auth.admin.from("profiles").select("name").eq("id", reply.author_id).single(),
    ]);
    if (!parent || !prototype || !author || !replyAuthor) return json({ error: "Reply notification data is incomplete" }, 422);
    if (!prototype.slack_channel_id) return json({ error: "Slack is not connected for this prototype." }, 409);
    if (!parent.slack_ts) return json({ error: "The parent Slack message has not been created yet." }, 409);
    const link = deepLink(prototype.id, parent.id);
    const authorMention = author.slack_user_id ? `<@${author.slack_user_id}>` : "Prototype author";
    const result = await slackApi(token, "chat.postMessage", { channel: prototype.slack_channel_id, thread_ts: parent.slack_ts, text: `${authorMention} — ${replyAuthor.name} replied on *${prototype.name}*\n${quote(reply.body)}\n<${link}|View thread →>` });
    await auth.admin.from("replies").update({ slack_ts: result.ts }).eq("id", reply.id);
    return json({ ok: true, ts: result.ts });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Slack notification failed" }, 502);
  }
});
