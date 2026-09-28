export type EmbedMode = "live" | "new_tab";

export type PrototypeSummary = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  owner_slack_id: string;
  owner_name: string;
  slack_channel_id: string;
  slack_channel_name: string;
  embed_mode: EmbedMode;
  embed_reason: string | null;
  favicon_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  open_comment_count: number;
};

export type SlackUser = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type SlackChannel = {
  id: string;
  name: string;
  is_private: boolean;
};

export type SlackDirectory = {
  users: SlackUser[];
  channels: SlackChannel[];
};

export type EmbedCheck = {
  embeddable: boolean;
  reason: string;
  final_url: string;
  title: string | null;
  favicon_url: string | null;
  requires_sign_in: boolean;
};

export type Viewport = 1440 | 768 | 390;

export type CommentAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type ReplyRecord = {
  id: string;
  comment_id: string;
  author_id: string;
  body: string;
  slack_ts: string | null;
  created_at: string;
  author?: CommentAuthor;
};

export type CommentRecord = {
  id: string;
  prototype_id: string;
  author_id: string;
  body: string;
  status: "open" | "resolved";
  screen_label: string | null;
  viewport: Viewport | null;
  x_pct: number | null;
  y_pct: number | null;
  selector: string | null;
  scroll_y: number | null;
  snapshot_url: string | null;
  slack_ts: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  author?: CommentAuthor;
  replies: ReplyRecord[];
};
