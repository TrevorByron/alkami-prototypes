import { isDemoMode } from "@/lib/demoMode";
import { supabase } from "@/lib/supabase";

export const mantlRepositoryUrl = "https://github.com/myfintech/prototyping-in-mantl";
export const templateGitHubUrl = `${mantlRepositoryUrl}/releases/download/latest/prototyping-in-mantl.zip`;

// A download from the Prototyping in MANTL releases: "template", or a copy
// such as "dark-mode.zip". The repository is private to the GitHub
// organisation, so the plain GitHub link only works for a browser signed in
// there; the download-asset function turns a library sign-in into a
// short-lived direct link instead. The GitHub link stays as the fallback.
export async function startDownload(asset: "template" | `${string}.zip`, fallbackUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isDemoMode || !supabase) {
    window.location.assign(fallbackUrl);
    return { ok: true };
  }
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("download-asset", { body: { asset } });
  // A refusal comes back as a FunctionsHttpError whose body holds the reason.
  let message = error?.message ?? data?.error ?? null;
  if (error && "context" in error && error.context instanceof Response) {
    try {
      message = ((await error.context.json()) as { error?: string }).error ?? message;
    } catch {
      /* keep the generic message */
    }
  }
  if (data?.url && !error) {
    window.location.assign(data.url);
    return { ok: true };
  }
  return { ok: false, error: message ?? "The download could not be prepared." };
}
