/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, supabaseConfigured } from "@/lib/supabase";

export type Profile = {
  id: string;
  slack_user_id: string;
  team_id: string;
  name: string;
  avatar_url: string | null;
  email: string | null;
};

export type AuthStatus = "loading" | "signed_out" | "signed_in" | "rejected" | "unconfigured";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  error: string | null;
  signInWithSlack: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readClaim(user: User, keys: string[]) {
  const metadata = { ...user.user_metadata, ...user.app_metadata } as Record<string, unknown>;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function getSlackClaims(user: User) {
  return {
    teamId: readClaim(user, ["team_id", "teamId", "https://slack.com/team_id", "https://slack.com/teamId"]),
    slackUserId: readClaim(user, ["slack_user_id", "user_id", "userId", "https://slack.com/user_id", "https://slack.com/userId"]),
    name: readClaim(user, ["name", "display_name", "real_name", "https://slack.com/name"]) || user.email || "Slack member",
    avatarUrl: readClaim(user, ["avatar_url", "picture", "image_192", "https://slack.com/avatar_url"]),
  };
}

function friendlyAuthError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "We could not complete Slack sign-in. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabaseConfigured ? "loading" : "unconfigured");
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setStatus(supabaseConfigured ? "signed_out" : "unconfigured");
  }, []);

  const hydrateSession = useCallback(async (session: Session | null) => {
    if (!session || !supabase) {
      clearSession();
      return;
    }

    setUser(session.user);
    setError(null);

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, slack_user_id, team_id, name, avatar_url, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError || !data) {
      // The profile trigger rejects users outside the configured Alkami Slack workspace.
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setStatus("rejected");
      setError("Only Alkami Slack members can use this.");
      return;
    }

    setProfile(data as Profile);
    setStatus("signed_in");
  }, [clearSession]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) void hydrateSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void hydrateSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrateSession]);

  const signInWithSlack = useCallback(async () => {
    if (!supabase) {
      setError("Add the Supabase URL and anon key before signing in.");
      return;
    }

    setError(null);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: { redirectTo },
    });

    if (signInError) setError(friendlyAuthError(signInError));
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(friendlyAuthError(signOutError));
  }, []);

  const value = useMemo(() => ({ user, profile, status, error, signInWithSlack, signOut }), [error, profile, signInWithSlack, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
