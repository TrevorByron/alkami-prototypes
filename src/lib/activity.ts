import { isDemoMode } from "@/lib/demoMode";
import { recordDemoView } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";

// What this browser has seen, for the library's "New" badges and unread
// comment counts. Kept in localStorage, so it is per browser, and read
// defensively because storage can be unavailable.
//
// started:   when this browser first tracked anything. Comments and
//            prototypes from before then never count as new or unread.
// library:   the previous library visit.
// opened:    when each prototype was last opened here.

type Seen = { started: string; library: string | null; opened: Record<string, string> };

const KEY = "alkami:seen";

function read(): Seen {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Seen | null;
    if (value?.started) return { started: value.started, library: value.library ?? null, opened: value.opened ?? {} };
  } catch { /* storage unavailable or corrupt */ }
  return { started: new Date().toISOString(), library: null, opened: {} };
}

function write(value: Seen) {
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// Call once when the library opens: returns the cut-off for "New" (the
// previous visit, or null on a first visit) and records this visit.
export function startLibraryVisit() {
  const seen = read();
  const previous = seen.library;
  write({ ...seen, library: new Date().toISOString() });
  return previous;
}

export function markPrototypeSeen(id: string) {
  const seen = read();
  write({ ...seen, opened: { ...seen.opened, [id]: new Date().toISOString() } });
}

// Comments posted since this browser last opened the prototype.
export function unreadCount(id: string, commentTimes: string[] | undefined) {
  if (!commentTimes?.length) return 0;
  const seen = read();
  const since = seen.opened[id] ?? seen.started;
  return commentTimes.filter((time) => time > since).length;
}

// Records that the signed-in member opened a prototype, once per person
// (prototype_views). Fails quietly until the migration is applied.
export async function recordView(prototypeId: string) {
  if (isDemoMode) { recordDemoView(prototypeId); return; }
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const viewerId = data.session?.user.id;
  if (!viewerId) return;
  await supabase.from("prototype_views").upsert({ prototype_id: prototypeId, viewer_id: viewerId, viewed_at: new Date().toISOString() }, { onConflict: "prototype_id,viewer_id" });
}
