import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AuthContext = { admin: SupabaseClient; user: User };

export async function requireAlkamiMember(request: Request): Promise<AuthContext | Response> {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const allowedTeamId = Deno.env.get("ALLOWED_SLACK_TEAM_ID");

  if (!token || !supabaseUrl || !serviceRoleKey || !allowedTeamId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await admin.from("profiles").select("team_id").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.team_id !== allowedTeamId) return json({ error: "Only Alkami Slack members can use this." }, 403);

  return { admin, user };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
