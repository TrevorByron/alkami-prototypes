import type { CommentAuthor, CommentRecord, PrototypeSummary, ReplyRecord, SlackChannel, SlackDirectory, SlackUser, Viewport } from "@/lib/types";

const prototypesKey = "commentor:demo:prototypes";
const commentsKey = "commentor:demo:comments";
const repliesKey = "commentor:demo:replies";

export const demoProfile: CommentAuthor & { slack_user_id: string; team_id: string; auth_provider: "email"; email: string } = {
  id: "demo-user",
  slack_user_id: "demo-user",
  name: "Demo reviewer",
  avatar_url: null,
  team_id: "demo-team",
  auth_provider: "email",
  email: "demo@example.test",
};

export const demoDirectory: SlackDirectory = {
  users: [
    { id: "demo-owner", name: "Demo owner", avatar_url: null },
    { id: "demo-reviewer", name: "Demo reviewer", avatar_url: null },
  ],
  channels: [
    { id: "demo-channel", name: "prototype-review", is_private: false },
    { id: "demo-private-channel", name: "demo-private", is_private: true },
  ],
};

function read<T>(key: string): T[] {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}

function write<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function now() { return new Date().toISOString(); }

export function listDemoPrototypes() {
  return read<PrototypeSummary>(prototypesKey).map((prototype) => ({ ...prototype, open_comment_count: countOpenComments(prototype.id) }));
}

export function getDemoPrototype(id: string) {
  return listDemoPrototypes().find((prototype) => prototype.id === id) ?? null;
}

export function createDemoPrototype(input: { name: string; url: string; description: string | null; owner_id: string; owner_slack_id: string | null; owner_name: string; slack_channel_id: string | null; slack_channel_name: string | null; embed_mode: "live" | "new_tab"; embed_reason: string; favicon_url: string | null; }) {
  const timestamp = now();
  const prototype: PrototypeSummary = { id: crypto.randomUUID(), ...input, created_by: demoProfile.id, created_at: timestamp, updated_at: timestamp, open_comment_count: 0 };
  write(prototypesKey, [...read<PrototypeSummary>(prototypesKey), prototype]);
  return prototype;
}

export function deleteDemoPrototype(id: string) {
  write(prototypesKey, read<PrototypeSummary>(prototypesKey).filter((prototype) => prototype.id !== id));
  const commentIds = new Set(read<CommentRecord>(commentsKey).filter((comment) => comment.prototype_id === id).map((comment) => comment.id));
  write(commentsKey, read<CommentRecord>(commentsKey).filter((comment) => comment.prototype_id !== id));
  write(repliesKey, read<ReplyRecord>(repliesKey).filter((reply) => !commentIds.has(reply.comment_id)));
}

function countOpenComments(prototypeId: string) {
  return read<CommentRecord>(commentsKey).filter((comment) => comment.prototype_id === prototypeId && comment.status === "open").length;
}

function author(): CommentAuthor { return demoProfile; }

export function listDemoComments(prototypeId: string) {
  const replies = read<ReplyRecord>(repliesKey);
  const prototypeUrl = getDemoPrototype(prototypeId)?.url ?? null;
  return read<CommentRecord>(commentsKey).filter((comment) => comment.prototype_id === prototypeId).map((comment) => ({ ...comment, page_url: "page_url" in comment ? comment.page_url : prototypeUrl, author: author(), replies: replies.filter((reply) => reply.comment_id === comment.id).map((reply) => ({ ...reply, author: author() })) }));
}

export function addDemoComment(input: { prototype_id: string; body: string; page_url: string | null; screen_label: string | null; viewport: Viewport | null; x_pct: number | null; y_pct: number | null; selector: string | null; scroll_y: number | null; }) {
  const comment: CommentRecord = { id: crypto.randomUUID(), ...input, author_id: demoProfile.id, status: "open", snapshot_url: null, slack_ts: null, resolved_by: null, resolved_at: null, resolution_note: null, created_at: now(), author: author(), replies: [] };
  write(commentsKey, [...read<CommentRecord>(commentsKey), comment]);
  return comment;
}

export function addDemoReply(input: { comment_id: string; body: string }) {
  const reply: ReplyRecord = { id: crypto.randomUUID(), comment_id: input.comment_id, author_id: demoProfile.id, body: input.body, slack_ts: null, created_at: now(), author: author() };
  write(repliesKey, [...read<ReplyRecord>(repliesKey), reply]);
  return reply;
}

export function updateDemoComment(id: string, values: { status: "open" | "resolved"; resolved_by: string | null; resolved_at: string | null; resolution_note: string | null; }) {
  const next = read<CommentRecord>(commentsKey).map((comment) => comment.id === id ? { ...comment, ...values } : comment);
  write(commentsKey, next);
}

export function clearDemoData() {
  [prototypesKey, commentsKey, repliesKey].forEach((key) => window.localStorage.removeItem(key));
}

export function isDemoUser(userId: string) { return userId === demoProfile.id; }

export function demoSlackUser(id: string): SlackUser | undefined { return demoDirectory.users.find((user) => user.id === id); }
export function demoSlackChannel(id: string): SlackChannel | undefined { return demoDirectory.channels.find((channel) => channel.id === id); }
