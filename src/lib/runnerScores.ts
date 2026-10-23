import { isDemoMode } from "@/lib/demoMode";
import { supabase } from "@/lib/supabase";

// High scores for the pixel runner easter egg, kept on each member's profile
// (profiles.runner_best, migration 20261023120000_runner_high_scores.sql).
// Every call fails quietly: until the migration is applied, or in demo mode,
// the game keeps its best score in this browser and the board shows only you.

export type ScoreEntry = { id: string; name: string; score: number };

export const LEADERBOARD_SIZE = 5;

export async function fetchLeaderboard(): Promise<ScoreEntry[] | null> {
  if (isDemoMode || !supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, runner_best")
    .gt("runner_best", 0)
    .order("runner_best", { ascending: false })
    .order("runner_best_at", { ascending: true })
    .limit(LEADERBOARD_SIZE);
  if (error || !data) return null;
  return data.map((row) => ({ id: row.id as string, name: row.name as string, score: row.runner_best as number }));
}

// The player's place among everyone: their saved best and how many members
// have beaten it. Null when it can't be read (demo mode, no migration yet).
export async function fetchMyStanding(userId: string | undefined): Promise<{ best: number; rank: number | null } | null> {
  if (isDemoMode || !supabase || !userId) return null;
  const mine = await supabase.from("profiles").select("runner_best").eq("id", userId).maybeSingle();
  if (mine.error || !mine.data) return null;
  const best = mine.data.runner_best as number;
  if (best <= 0) return { best, rank: null };
  const ahead = await supabase.from("profiles").select("id", { count: "exact", head: true }).gt("runner_best", best);
  return { best, rank: ahead.error || ahead.count === null ? null : ahead.count + 1 };
}

export async function recordRunnerScore(score: number) {
  if (isDemoMode || !supabase || score <= 0) return;
  await supabase.rpc("record_runner_score", { p_score: score });
}

export function ordinal(rank: number) {
  const tens = rank % 100;
  if (tens >= 11 && tens <= 13) return `${rank}th`;
  return `${rank}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[rank % 10] ?? "th"}`;
}

// Puts a finished run on the board: raises the player's own entry, or adds it,
// then keeps the top LEADERBOARD_SIZE.
export function placeOnBoard(board: ScoreEntry[], entry: ScoreEntry) {
  const existing = board.find((row) => row.id === entry.id);
  const next = existing
    ? board.map((row) => (row.id === entry.id ? { ...row, score: Math.max(row.score, entry.score) } : row))
    : [...board, entry];
  return next.sort((left, right) => right.score - left.score).slice(0, LEADERBOARD_SIZE);
}
