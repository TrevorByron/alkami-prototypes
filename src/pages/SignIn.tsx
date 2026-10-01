import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { AppMark } from "@/components/AppMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoBanner } from "@/components/ui/info-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabaseConfigured } from "@/lib/supabase";
import { allowedEmailDomain } from "@/lib/authConfig";

export function SignIn() {
  const navigate = useNavigate();
  const { status, error, signInWithEmail } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const setupMessage = "This workspace is not connected to Supabase yet.";

  useEffect(() => {
    if (retryIn === 0) return;
    const timer = window.setInterval(() => setRetryIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [retryIn]);

  useEffect(() => {
    if (status === "signed_in") navigate("/", { replace: true });
  }, [navigate, status]);

  async function handleSignIn() {
    if (retryIn > 0) return;
    setSigningIn(true);
    const sent = await signInWithEmail(email);
    setLinkSent(sent);
    if (sent) setRetryIn(60);
    setSigningIn(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-carbon-0 p-6">
      <Card className="w-full max-w-md px-8 py-8">
        <div className="flex flex-col items-center text-center">
          <AppMark className="mb-4 h-12 w-12" />
          <h1 className="text-2xl font-medium leading-8 text-abyss-9">Welcome to Alkami Prototypes</h1>
          <p className="mt-1 max-w-xs text-sm text-abyss-5">A shared space to explore what teammates are building and leave thoughtful feedback.</p>
        </div>
        <div className="mt-6 space-y-4">
          {!supabaseConfigured ? <InfoBanner type="warning">{setupMessage}</InfoBanner> : null}
          {error ? <InfoBanner type="danger">{error}</InfoBanner> : null}
          {linkSent ? <InfoBanner type="success" title="Check your inbox">We sent a sign-in link to your {allowedEmailDomain} email. It expires after a short time and can only be used once.</InfoBanner> : null}
          <div className="space-y-2">
            <Label htmlFor="sign-in-email">Alkami email</Label>
            <Input id="sign-in-email" value={email} onChange={(event) => { setEmail(event.target.value); setLinkSent(false); }} onKeyDown={(event) => { if (event.key === "Enter") void handleSignIn(); }} placeholder={`you@${allowedEmailDomain}`} type="email" autoComplete="email" />
          </div>
          <Button className="w-full" size="lg" onClick={() => void handleSignIn()} disabled={signingIn || retryIn > 0 || !supabaseConfigured || !email.trim()}>
            {signingIn ? <Loader2 className="animate-spin" /> : <Mail />}{signingIn ? "Sending sign-in link…" : retryIn > 0 ? `Try again in ${retryIn}s` : "Email me a sign-in link"}
          </Button>
        </div>
        <Separator className="my-6 h-px w-full" />
        <p className="flex items-start gap-2 text-xs text-abyss-5"><ShieldCheck className="h-4 w-4 shrink-0 text-tiaga-6" />Only {allowedEmailDomain} accounts can sign in. Access is checked before the app loads.</p>
      </Card>
    </main>
  );
}
