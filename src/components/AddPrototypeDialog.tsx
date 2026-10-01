import { useState, type FormEvent } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { isDemoMode } from "@/lib/demoMode";
import { createDemoPrototype } from "@/lib/demoStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { EmbedCheck } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void };

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function AddPrototypeDialog({ open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [check, setCheck] = useState<EmbedCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setUrl(""); setName(""); setDescription(""); setCheck(null); setFormError(null); setSaving(false);
  };

  async function checkUrl() {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    try {
      new URL(normalized);
    } catch {
      setFormError("Enter a valid URL.");
      return;
    }
    setChecking(true); setFormError(null); setCheck(null);
    if (isDemoMode) {
      const parsed = new URL(normalized);
      const blocked = /(^|\.)github\.com$/i.test(parsed.hostname);
      const demoCheck: EmbedCheck = { embeddable: !blocked, reason: blocked ? "GitHub prevents embedding in another application." : "Demo mode marked this URL as embeddable.", final_url: normalized, title: parsed.hostname, favicon_url: `${parsed.origin}/favicon.ico`, requires_sign_in: false };
      setUrl(normalized); setCheck(demoCheck);
      if (!name.trim()) setName(parsed.hostname);
      setChecking(false);
      return;
    }
    const { data, error } = await supabase?.functions.invoke<EmbedCheck>("check-embed", { body: { url: normalized } }) ?? { data: null, error: new Error("Supabase is not configured.") };
    if (error || !data) {
      const checkerUnavailable = error?.message.toLowerCase().includes("failed to send a request") || error?.message.toLowerCase().includes("fetcherror");
      if (checkerUnavailable) {
        const parsed = new URL(normalized);
        const fallbackCheck: EmbedCheck = {
          embeddable: false,
          reason: "The live embed checker is unavailable, so this prototype will open in a new tab for now.",
          final_url: normalized,
          title: parsed.hostname,
          favicon_url: `${parsed.origin}/favicon.ico`,
          requires_sign_in: false,
        };
        setUrl(normalized);
        setCheck(fallbackCheck);
        if (!name.trim()) setName(parsed.hostname.replace(/^www\./i, ""));
        setFormError(null);
      } else {
        setFormError(error?.message ?? "We could not check this URL.");
      }
      setChecking(false);
      return;
    }
    setUrl(normalized); setCheck(data);
    if (!name.trim() && data.title) setName(data.title);
    setChecking(false);
  }

  async function savePrototype(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!check) { setFormError("Check the URL before saving."); return; }
    if (!user) { setFormError("Sign in before adding a prototype."); return; }
    if (!name.trim()) { setFormError("Add a name for this prototype."); return; }
    setSaving(true); setFormError(null);
    if (isDemoMode && user) {
      const demoPrototype = createDemoPrototype({ name: name.trim(), url: normalizeUrl(url), description: description.trim() || null, owner_id: user.id, owner_slack_id: null, owner_name: profile?.name ?? user.email ?? "Alkami teammate", slack_channel_id: null, slack_channel_name: null, embed_mode: check.embeddable ? "live" : "new_tab", embed_reason: check.reason, favicon_url: check.favicon_url });
      onCreated(); reset(); onOpenChange(false); navigate(`/p/${demoPrototype.id}`);
      return;
    }
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("prototypes").insert({
      name: name.trim(), url: normalizeUrl(url), description: description.trim() || null,
      owner_id: user.id, owner_slack_id: null, owner_name: profile?.name ?? user.email ?? "Alkami teammate", slack_channel_id: null, slack_channel_name: null,
      embed_mode: check.embeddable ? "live" : "new_tab", embed_reason: check.reason, favicon_url: check.favicon_url,
      created_by: user.id,
    }).select("id").single();
    if (error || !data) { setFormError(error?.message ?? "We could not save this prototype."); setSaving(false); return; }
    onCreated(); reset(); onOpenChange(false); navigate(`/p/${data.id}`);
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>Add a prototype</DialogTitle><DialogDescription>Give your team a place to review this hosted prototype together.</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={(event) => void savePrototype(event)}>
        <div className="space-y-2"><Label htmlFor="prototype-url">Prototype URL</Label><div className="flex gap-2"><Input id="prototype-url" value={url} onChange={(event) => setUrl(event.target.value)} onBlur={() => void checkUrl()} placeholder="https://your-prototype.example.com" type="url" required /><Button type="button" variant="outline" onClick={() => void checkUrl()} disabled={checking}>{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{checking ? "Checking" : "Check"}</Button></div>{check ? <div className={cn("rounded-lg border px-3 py-2.5 text-sm", check.embeddable ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-200")}><div className="flex items-center justify-between gap-3"><span className="font-medium">{check.requires_sign_in ? "Ready to try in the frame" : check.embeddable ? "Ready to embed" : "Will open in a new tab"}</span><Badge variant="outline" className="bg-background/60">{check.requires_sign_in ? "Sign-in detected" : check.embeddable ? "Live" : "New tab"}</Badge></div><p className="mt-1 text-xs opacity-80">{check.reason}</p></div> : null}</div>
        <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="prototype-name">Name</Label><Input id="prototype-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Treasury dashboard" required /></div><div className="space-y-2"><Label>Built by</Label><div className="flex h-10 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">{(profile?.name ?? user?.email ?? "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="truncate">{profile?.name ?? user?.email ?? "Your Alkami account"}</span></div></div></div>
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">Slack channel notifications are optional for now. We can connect this prototype to Slack later without changing who built it or who commented.</div>
        <div className="space-y-2"><Label htmlFor="prototype-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="prototype-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should reviewers pay attention to?" className="flex min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div>
        {formError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{formError}</p> : null}
        <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || checking}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Add prototype"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
