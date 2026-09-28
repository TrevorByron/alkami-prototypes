import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { CommentAuthor, CommentRecord, ReplyRecord } from "@/lib/types";

export function useCommentThreads(prototypeId: string | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user || !prototypeId) {
      setComments([]);
      setLoading(false);
      return;
    }
    const [commentsResult, repliesResult, profilesResult] = await Promise.all([
      supabase.from("comments").select("*").eq("prototype_id", prototypeId).order("created_at", { ascending: true }),
      supabase.from("replies").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, name, avatar_url"),
    ]);
    const queryError = commentsResult.error ?? repliesResult.error ?? profilesResult.error;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    const authors = new Map<string, CommentAuthor>((profilesResult.data ?? []).map((profile) => [profile.id, profile as CommentAuthor]));
    const repliesByComment = new Map<string, ReplyRecord[]>();
    for (const reply of (repliesResult.data ?? []) as ReplyRecord[]) {
      const next = { ...reply, author: authors.get(reply.author_id) };
      repliesByComment.set(reply.comment_id, [...(repliesByComment.get(reply.comment_id) ?? []), next]);
    }
    const next = (commentsResult.data ?? []).map((comment) => {
      const row = comment as CommentRecord;
      return { ...row, author: authors.get(row.author_id), replies: repliesByComment.get(row.id) ?? [] };
    });
    setComments(next);
    setError(null);
    setLoading(false);
  }, [prototypeId, user]);

  useEffect(() => {
    void load();
    if (!supabase || !prototypeId) return;
    const channel = supabase.channel(`prototype-comments-${prototypeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `prototype_id=eq.${prototypeId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, () => void load())
      .subscribe();
    return () => { if (supabase) void supabase.removeChannel(channel); };
  }, [load, prototypeId]);

  return { comments, loading, error, refresh: load };
}
