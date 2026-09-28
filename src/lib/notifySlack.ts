import { toast } from "sonner";

import { isDemoMode } from "@/lib/demoMode";
import { supabase } from "@/lib/supabase";

export type SlackNotificationType = "comment" | "reply" | "resolved" | "reopened";

export async function notifySlack(type: SlackNotificationType, id: string) {
  if (isDemoMode) return;
  if (!supabase) return;
  const { error } = await supabase.functions.invoke("notify-slack", { body: { type, id } });
  if (error) toast.error("Saved, but Slack notification failed.");
}
