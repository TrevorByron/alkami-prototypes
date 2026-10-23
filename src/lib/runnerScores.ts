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

export async function recordRunnerScore(score: number) {
  if (isDemoMode || !supabase || score <= 0) return;
  await supabase.rpc("record_runner_score", { p_score: score });
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
