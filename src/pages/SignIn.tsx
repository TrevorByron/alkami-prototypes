import { useEffect, useState } from "react";
import { Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabaseConfigured } from "@/lib/supabase";

export function SignIn({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const navigate = useNavigate();
  const { status, error, signInWithSlack } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const isRejected = status === "rejected";
  const setupMessage = "This workspace is not connected to Supabase yet.";

  useEffect(() => {
    if (status === "signed_in") navigate("/", { replace: true });
  }, [navigate, status]);

  async function handleSignIn() {
    setSigningIn(true);
    await signInWithSlack();
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
          {isRejected ? <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-200">Only Alkami Slack members can use this.</div> : null}
          {!supabaseConfigured ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-950 dark:bg-amber-950/40 dark:text-amber-200">{setupMessage}</div> : null}
          {error && !isRejected && supabaseConfigured ? <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}
          <Button className="w-full" size="lg" onClick={() => void handleSignIn()} disabled={signingIn || !supabaseConfigured}>
            <SlackMark />{signingIn ? "Connecting to Slack…" : "Sign in with Slack"}
          </Button>
          <div className="my-6 flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">Alkami workspace only</span><Separator className="flex-1" /></div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Your access is checked against your Slack workspace before the app loads.</p>
        </CardContent>
      </Card>
    </main>
  );
}

function SlackMark() {
  return <span aria-hidden="true" className="grid h-5 w-5 grid-cols-2 gap-0.5"><span className="rounded-tl-sm bg-[#36c5f0]" /><span className="rounded-tr-sm bg-[#2eb67d]" /><span className="rounded-bl-sm bg-[#e01e5a]" /><span className="rounded-br-sm bg-[#ecb22e]" /></span>;
}
