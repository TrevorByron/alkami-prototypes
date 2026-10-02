import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { isDemoMode } from "@/lib/demoMode";
import { isOwnApp } from "@/lib/selfEmbed";
import { createDemoPrototype } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import { prototypeTags, type PrototypeTagId } from "@/lib/tags";
import type { EmbedCheck } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InfoBanner } from "@/components/ui/info-banner";
import { Label } from "@/components/ui/label";
import { SelectionPill } from "@/components/ui/selection-pill";
import { Textarea } from "@/components/ui/textarea";
import { UserIdentity } from "@/components/UserIdentity";

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
  const [tags, setTags] = useState<PrototypeTagId[]>([]);

  const reset = () => {
    setUrl(""); setName(""); setDescription(""); setTags([]); setCheck(null); setFormError(null); setSaving(false);
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
    if (isOwnApp(normalized)) {
      setFormError("This is the Alkami Prototypes app itself. Add a prototype hosted somewhere else.");
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
      const demoPrototype = createDemoPrototype({ name: name.trim(), url: normalizeUrl(url), description: description.trim() || null, owner_id: user.id, owner_slack_id: null, owner_name: profile?.name ?? user.email ?? "Alkami teammate", slack_channel_id: null, slack_channel_name: null, embed_mode: check.embeddable ? "live" : "new_tab", embed_reason: check.reason, favicon_url: check.favicon_url, tags });
      onCreated(); reset(); onOpenChange(false); navigate(`/p/${demoPrototype.id}`);
      return;
    }
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("prototypes").insert({
      name: name.trim(), url: normalizeUrl(url), description: description.trim() || null,
      owner_id: user.id, owner_slack_id: null, owner_name: profile?.name ?? user.email ?? "Alkami teammate", slack_channel_id: null, slack_channel_name: null,
      embed_mode: check.embeddable ? "live" : "new_tab", embed_reason: check.reason, favicon_url: check.favicon_url,
      tags, created_by: user.id,
    }).select("id").single();
    if (error || !data) { setFormError(error?.message ?? "We could not save this prototype."); setSaving(false); return; }
    onCreated(); reset(); onOpenChange(false); navigate(`/p/${data.id}`);
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Add a prototype</DialogTitle><DialogDescription>Give your team a place to review this hosted prototype together.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={(event) => void savePrototype(event)}>
        <div className="space-y-2"><Label htmlFor="prototype-url">Prototype URL</Label><div className="flex gap-2"><Input id="prototype-url" value={url} onChange={(event) => setUrl(event.target.value)} onBlur={() => void checkUrl()} placeholder="https://your-prototype.example.com" type="url" required /><Button type="button" variant="secondary" size="lg" onClick={() => void checkUrl()} disabled={checking}>{checking ? <Loader2 className="animate-spin" /> : <Search />}{checking ? "Checking" : "Check"}</Button></div>{check ? <InfoBanner type={check.embeddable ? "success" : "warning"} title={check.requires_sign_in ? "Ready to try in the frame" : check.embeddable ? "Ready to embed" : "Will open in a new tab"} action={<Badge variant={check.embeddable ? "success" : "warning"}>{check.requires_sign_in ? "Sign-in detected" : check.embeddable ? "Live" : "New tab"}</Badge>}>{check.reason}</InfoBanner> : null}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="prototype-name">Name</Label><Input id="prototype-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Treasury dashboard" required /></div><div className="space-y-2"><Label>Built by</Label><div className="flex h-11 items-center rounded-lg border border-carbon-3 bg-carbon-0 px-3"><UserIdentity id={user?.id} name={profile?.name ?? user?.email ?? "Your Alkami account"} /></div></div></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium leading-5 text-abyss-9">Tags <span className="font-normal text-abyss-5">(pick any that apply)</span></legend><div className="flex flex-wrap gap-2">{prototypeTags.map((tag) => { const selected = tags.includes(tag.id); return <SelectionPill key={tag.id} selected={selected} title={tag.hint} onClick={() => setTags((current) => selected ? current.filter((id) => id !== tag.id) : [...current, tag.id])}><span aria-hidden>{tag.emoji}</span>{tag.label}</SelectionPill>; })}</div></fieldset>
        <div className="space-y-2"><Label htmlFor="prototype-description">Description <span className="font-normal text-abyss-5">(optional)</span></Label><Textarea id="prototype-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should reviewers pay attention to?" className="resize-none" /></div>
        <InfoBanner type="grayscale">Slack notifications are optional for now. You can connect this prototype to Slack later without changing who built it or who commented.</InfoBanner>
        {formError ? <InfoBanner type="danger">{formError}</InfoBanner> : null}
        <DialogFooter><Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" size="lg" disabled={saving || checking}>{saving ? <Loader2 className="animate-spin" /> : null}{saving ? "Saving…" : "Add prototype"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
