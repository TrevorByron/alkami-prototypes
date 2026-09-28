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
  const allowedEmailDomain = (Deno.env.get("ALLOWED_EMAIL_DOMAIN") ?? "alkami.com").replace(/^@/, "").trim().toLowerCase();

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await admin.from("profiles").select("email, is_active").eq("id", user.id).maybeSingle();
  const email = (profile?.email ?? user.email ?? "").trim().toLowerCase();
  if (profileError || !profile || profile.is_active === false || !email.endsWith(`@${allowedEmailDomain}`)) return json({ error: `Only ${allowedEmailDomain} members can use this.` }, 403);

  return { admin, user };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
