import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { isDemoMode } from "@/lib/demoMode";
import { deleteDemoPrototype, getDemoPrototype, listDemoPrototypes } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { PrototypeSummary } from "@/lib/types";

export function usePrototype(id: string | undefined) {
  const { user } = useAuth();
  const [prototype, setPrototype] = useState<PrototypeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setPrototype(id ? getDemoPrototype(id) : null);
      setError(null);
      setLoading(false);
      return;
    }
    if (!supabase || !user || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase.from("prototypes").select("*").eq("id", id).maybeSingle();
    if (queryError || !data) {
      setError(queryError?.message ?? "Prototype not found.");
      setLoading(false);
      return;
    }
    setPrototype({ ...(data as PrototypeSummary), tags: (data as PrototypeSummary).tags ?? [], open_comment_count: 0 });
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
    if (isDemoMode) {
      setPrototypes(listDemoPrototypes());
      setError(null);
      setLoading(false);
      return;
    }
    if (!supabase || !user) {
      setPrototypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [prototypeResult, commentsResult, viewsResult] = await Promise.all([
      // Prototypes archived at their source (Prototyping in MANTL) keep their
      // row and comments but leave the library.
      supabase
        .from("prototypes")
        .select("*")
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      supabase.from("comments").select("prototype_id, status, created_at"),
      // Optional: until the prototype_views migration is applied this errors
      // and every card just shows no view count.
      supabase.from("prototype_views").select("prototype_id"),
    ]);

    if (prototypeResult.error || commentsResult.error) {
      setError(prototypeResult.error?.message ?? commentsResult.error?.message ?? "We could not load prototypes.");
      setLoading(false);
      return;
    }

    const openComments = new Map<string, number>();
    const commentTimes = new Map<string, string[]>();
    for (const comment of commentsResult.data ?? []) {
      if (comment.status === "open") openComments.set(comment.prototype_id, (openComments.get(comment.prototype_id) ?? 0) + 1);
      commentTimes.set(comment.prototype_id, [...(commentTimes.get(comment.prototype_id) ?? []), comment.created_at as string]);
    }
    const views = new Map<string, number>();
    for (const view of viewsResult.error ? [] : viewsResult.data ?? []) {
      views.set(view.prototype_id, (views.get(view.prototype_id) ?? 0) + 1);
    }
    const next = (prototypeResult.data ?? []).map((prototype) => {
      const row = prototype as PrototypeSummary;
      return { ...row, tags: row.tags ?? [], open_comment_count: openComments.get(row.id) ?? 0, comment_times: commentTimes.get(row.id) ?? [], view_count: views.get(row.id) ?? 0 };
    });
    setPrototypes(next);
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Apply a saved change to one prototype without reloading the whole list.
  const patch = useCallback((id: string, fields: Partial<PrototypeSummary>) => {
    setPrototypes((current) => current.map((prototype) => prototype.id === id ? { ...prototype, ...fields } : prototype));
  }, []);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    const error = await deletePrototype(id, Boolean(user));
    if (!error) await load();
    return error;
  }, [load, user]);

  return { prototypes, loading, error, refresh: load, remove, patch };
}

// Deletes a prototype with its comments and replies. Returns an error message,
// or null once it is gone.
export async function deletePrototype(id: string, signedIn: boolean): Promise<string | null> {
  if (isDemoMode) {
    deleteDemoPrototype(id);
    return null;
  }
  if (!supabase || !signedIn) return "You must be signed in to delete a prototype.";
  const { error } = await supabase.from("prototypes").delete().eq("id", id);
  return error ? error.message : null;
}
