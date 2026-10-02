import { useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import { isDemoMode } from "@/lib/demoMode";
import { demoProfile } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";

export type Contributor = { id: string; name: string; email: string | null; avatar_url: string | null; first_signed_in_at: string | null };

// Everyone who has signed in. Falls back to all profiles if the
// signed_in_members migration hasn't been applied yet.
export function useContributors() {
  const { user } = useAuth();
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (isDemoMode) { setContributors([{ id: demoProfile.id, name: demoProfile.name, email: demoProfile.email, avatar_url: null, first_signed_in_at: null }]); return; }
      if (!supabase || !user) return;
      const signedIn = await supabase.rpc("signed_in_members");
      if (!signedIn.error) { if (active) setContributors((signedIn.data ?? []) as Contributor[]); return; }
      const profiles = await supabase.from("profiles").select("id, name, email, avatar_url, created_at").order("created_at");
      if (active && !profiles.error) setContributors((profiles.data ?? []).map(({ created_at, ...row }) => ({ ...row, first_signed_in_at: created_at }) as Contributor));
    }
    void load();
    return () => { active = false; };
  }, [user]);

  return contributors;
}
