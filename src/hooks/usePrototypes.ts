import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { PrototypeSummary } from "@/lib/types";

export function usePrototype(id: string | undefined) {
  const { user } = useAuth();
  const [prototype, setPrototype] = useState<PrototypeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase.from("prototypes").select("id, name, url, description, owner_slack_id, owner_name, slack_channel_id, slack_channel_name, embed_mode, embed_reason, favicon_url, created_by, created_at, updated_at").eq("id", id).maybeSingle();
    if (queryError || !data) {
      setError(queryError?.message ?? "Prototype not found.");
      setLoading(false);
      return;
    }
    setPrototype({ ...(data as PrototypeSummary), open_comment_count: 0 });
    setError(null);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { void load(); }, [load]);

  return { prototype, loading, error, refresh: load };
}

export function usePrototypes() {
  const { user } = useAuth();
  const [prototypes, setPrototypes] = useState<PrototypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setPrototypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [prototypeResult, commentsResult] = await Promise.all([
      supabase
        .from("prototypes")
        .select("id, name, url, description, owner_slack_id, owner_name, slack_channel_id, slack_channel_name, embed_mode, embed_reason, favicon_url, created_by, created_at, updated_at")
        .order("updated_at", { ascending: false }),
      supabase.from("comments").select("prototype_id").eq("status", "open"),
    ]);

    if (prototypeResult.error || commentsResult.error) {
      setError(prototypeResult.error?.message ?? commentsResult.error?.message ?? "We could not load prototypes.");
      setLoading(false);
      return;
    }

    const openComments = new Map<string, number>();
    for (const comment of commentsResult.data ?? []) {
      openComments.set(comment.prototype_id, (openComments.get(comment.prototype_id) ?? 0) + 1);
    }
    const next = (prototypeResult.data ?? []).map((prototype) => {
      const row = prototype as PrototypeSummary;
      return { ...row, open_comment_count: openComments.get(row.id) ?? 0 };
    });
    setPrototypes(next);
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { prototypes, loading, error, refresh: load };
}
