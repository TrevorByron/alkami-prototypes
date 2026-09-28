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
