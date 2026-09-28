import { useEffect, useState } from "react";
import { Mail, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabaseConfigured } from "@/lib/supabase";
import { allowedEmailDomain } from "@/lib/authConfig";

export function SignIn({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const navigate = useNavigate();
  const { status, error, signInWithEmail } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const setupMessage = "This workspace is not connected to Supabase yet.";

  useEffect(() => {
    if (status === "signed_in") navigate("/", { replace: true });
  }, [navigate, status]);

  async function handleSignIn() {
    setSigningIn(true);
    const sent = await signInWithEmail(email);
    setLinkSent(sent);
    setSigningIn(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="dot-grid absolute inset-0 opacity-50" />
      <Button aria-label={theme === "light" ? "Use dark mode" : "Use light mode"} variant="ghost" size="icon" className="absolute right-5 top-5" onClick={onToggleTheme}>
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
      <Card className="relative w-full max-w-md shadow-xl shadow-indigo-100/30 dark:shadow-black/20">
        <CardHeader className="items-center pb-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-indigo-200/50 dark:shadow-indigo-950"><Sparkles className="h-5 w-5" /></div>
          <CardTitle className="text-2xl tracking-tight">Welcome to Alkami Prototypes</CardTitle>
          <CardDescription className="max-w-xs">A shared space to explore what teammates are building and leave thoughtful feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseConfigured ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-950 dark:bg-amber-950/40 dark:text-amber-200">{setupMessage}</div> : null}
          {error ? <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}
          {linkSent ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200">Check your {allowedEmailDomain} inbox for a sign-in link. It expires after a short time and can only be used once.</div> : null}
          <label className="mb-2 block text-sm font-medium" htmlFor="sign-in-email">Alkami email</label>
          <input id="sign-in-email" value={email} onChange={(event) => { setEmail(event.target.value); setLinkSent(false); }} placeholder={`you@${allowedEmailDomain}`} type="email" autoComplete="email" className="mb-3 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
          <Button className="w-full" size="lg" onClick={() => void handleSignIn()} disabled={signingIn || !supabaseConfigured || !email.trim()}>
            <Mail className="h-4 w-4" />{signingIn ? "Sending sign-in link…" : "Email me a sign-in link"}
          </Button>
          <div className="my-6 flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">{allowedEmailDomain} users only</span><Separator className="flex-1" /></div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Access is checked against the Alkami email domain before the app loads. Slack identity and notifications can be connected later.</p>
        </CardContent>
      </Card>
    </main>
  );
}
