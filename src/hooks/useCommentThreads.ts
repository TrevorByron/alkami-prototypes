import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { isDemoMode } from "@/lib/demoMode";
import { listDemoComments } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { CommentAuthor, CommentRecord, ReplyRecord } from "@/lib/types";

export function useCommentThreads(prototypeId: string | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setComments(prototypeId ? listDemoComments(prototypeId) : []);
      setError(null);
      setLoading(false);
      return;
    }
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
    // Upvotes are optional: if the comment_upvotes migration hasn't been
    // applied yet, comments still load with zero votes.
    const commentIds = (commentsResult.data ?? []).map((comment) => comment.id as string);
    const upvotesResult = commentIds.length ? await supabase.from("comment_upvotes").select("comment_id, user_id").in("comment_id", commentIds) : { data: [] };
    const upvotersByComment = new Map<string, string[]>();
    for (const upvote of (upvotesResult.data ?? []) as Array<{ comment_id: string; user_id: string }>) {
      upvotersByComment.set(upvote.comment_id, [...(upvotersByComment.get(upvote.comment_id) ?? []), upvote.user_id]);
    }
    const authors = new Map<string, CommentAuthor>((profilesResult.data ?? []).map((profile) => [profile.id, profile as CommentAuthor]));
    const repliesByComment = new Map<string, ReplyRecord[]>();
    for (const reply of (repliesResult.data ?? []) as ReplyRecord[]) {
      const next = { ...reply, author: authors.get(reply.author_id) };
      repliesByComment.set(reply.comment_id, [...(repliesByComment.get(reply.comment_id) ?? []), next]);
    }
    const next = (commentsResult.data ?? []).map((comment) => {
      const row = comment as CommentRecord;
      return { ...row, author: authors.get(row.author_id), replies: repliesByComment.get(row.id) ?? [], upvoters: upvotersByComment.get(row.id) ?? [] };
    });
    setComments(next);
    setError(null);
    setLoading(false);
  }, [prototypeId, user]);

  useEffect(() => {
    void load();
    if (isDemoMode || !supabase || !prototypeId) return;
    const channel = supabase.channel(`prototype-comments-${prototypeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `prototype_id=eq.${prototypeId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_upvotes" }, () => void load())
      .subscribe();
    return () => { if (supabase) void supabase.removeChannel(channel); };
  }, [load, prototypeId]);

  return { comments, loading, error, refresh: load };
}
