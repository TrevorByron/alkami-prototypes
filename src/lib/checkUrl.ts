import { isDemoMode } from "@/lib/demoMode";
import { isOwnApp } from "@/lib/selfEmbed";
import { supabase } from "@/lib/supabase";
import type { EmbedCheck } from "@/lib/types";

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Asks the check-embed function whether a prototype URL can show in the live
// frame. Used when a prototype is added and when its link is changed.
export async function checkPrototypeUrl(normalized: string): Promise<{ check: EmbedCheck } | { error: string }> {
  try {
    new URL(normalized);
  } catch {
    return { error: "Enter a valid URL." };
  }
  if (isOwnApp(normalized)) return { error: "This is the Alkami Prototypes app itself. Add a prototype hosted somewhere else." };
  const parsed = new URL(normalized);
  if (isDemoMode) {
    const blocked = /(^|\.)github\.com$/i.test(parsed.hostname);
    return { check: { embeddable: !blocked, reason: blocked ? "GitHub prevents embedding in another application." : "Demo mode marked this URL as embeddable.", final_url: normalized, title: parsed.hostname, favicon_url: `${parsed.origin}/favicon.ico`, requires_sign_in: false } };
  }
  const { data, error } = await supabase?.functions.invoke<EmbedCheck>("check-embed", { body: { url: normalized } }) ?? { data: null, error: new Error("Supabase is not configured.") };
  if (data && !error) return { check: data };
  const checkerUnavailable = error?.message.toLowerCase().includes("failed to send a request") || error?.message.toLowerCase().includes("fetcherror");
  if (!checkerUnavailable) return { error: error?.message ?? "We could not check this URL." };
  return {
    check: {
      embeddable: false,
      reason: "The live embed checker is unavailable, so this prototype will open in a new tab for now.",
      final_url: normalized,
      title: parsed.hostname,
      favicon_url: `${parsed.origin}/favicon.ico`,
      requires_sign_in: false,
    },
  };
}
