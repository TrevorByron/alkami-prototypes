/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isDemoMode } from "@/lib/demoMode";
import { demoProfile } from "@/lib/demoStore";
import { allowedEmailDomain, isAllowedEmail } from "@/lib/authConfig";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type Profile = {
  id: string;
  slack_user_id: string | null;
  team_id: string | null;
  auth_provider: "email" | "slack";
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
  signInWithEmail: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const demoUser = {
  id: demoProfile.id,
  aud: "authenticated",
  role: "authenticated",
  email: demoProfile.email,
  app_metadata: { provider: "demo", providers: ["demo"] },
  user_metadata: { name: demoProfile.name },
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

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
  return "We could not send the sign-in link. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isDemoMode ? "signed_in" : supabaseConfigured ? "loading" : "unconfigured");
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setStatus(isDemoMode ? "signed_out" : supabaseConfigured ? "signed_out" : "unconfigured");
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
      .select("id, slack_user_id, team_id, auth_provider, name, avatar_url, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError || !data) {
      // The profile trigger rejects users outside the configured Alkami email domain.
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setStatus("rejected");
      setError(`Only ${allowedEmailDomain} email addresses can use this.`);
      return;
    }

    setProfile(data as Profile);
    setStatus("signed_in");
  }, [clearSession]);

  useEffect(() => {
    if (isDemoMode) {
      setUser(demoUser);
      setProfile(demoProfile);
      setStatus("signed_in");
      return;
    }
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

  const signInWithEmail = useCallback(async (email: string) => {
    if (isDemoMode) {
      setUser(demoUser);
      setProfile(demoProfile);
      setStatus("signed_in");
      return true;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      setError(`Use your ${allowedEmailDomain} email address.`);
      return false;
    }
    if (!supabase) {
      setError("Add the Supabase URL and anon key before signing in.");
      return false;
    }

    setError(null);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });

    if (signInError) {
      setError(friendlyAuthError(signInError));
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      clearSession();
      return;
    }
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(friendlyAuthError(signOutError));
  }, [clearSession]);

  const value = useMemo(() => ({ user, profile, status, error, signInWithEmail, signOut }), [error, profile, signInWithEmail, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
