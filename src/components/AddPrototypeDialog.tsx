import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronsUpDown, Loader2, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { useSlackDirectory } from "@/hooks/useSlackDirectory";
import { isDemoMode } from "@/lib/demoMode";
import { createDemoPrototype } from "@/lib/demoStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { EmbedCheck, SlackChannel, SlackUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void };

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function AddPrototypeDialog({ open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const directory = useSlackDirectory();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState<SlackUser | null>(null);
  const [channel, setChannel] = useState<SlackChannel | null>(null);
  const [check, setCheck] = useState<EmbedCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void directory.load();
  }, [open, directory.load]);

  const reset = () => {
    setUrl(""); setName(""); setDescription(""); setOwner(null); setChannel(null); setCheck(null); setFormError(null); setSaving(false);
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
      setFormError(error?.message ?? "We could not check this URL.");
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
    if (!owner || !channel) { setFormError("Choose an owner and Slack channel."); return; }
    if (!name.trim()) { setFormError("Add a name for this prototype."); return; }
    setSaving(true); setFormError(null);
    if (isDemoMode && user) {
      const demoPrototype = createDemoPrototype({ name: name.trim(), url: normalizeUrl(url), description: description.trim() || null, owner_slack_id: owner.id, owner_name: owner.name, slack_channel_id: channel.id, slack_channel_name: channel.name, embed_mode: check.embeddable ? "live" : "new_tab", embed_reason: check.reason, favicon_url: check.favicon_url });
      onCreated(); reset(); onOpenChange(false); navigate(`/p/${demoPrototype.id}`);
      return;
    }
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("prototypes").insert({
      name: name.trim(), url: normalizeUrl(url), description: description.trim() || null,
      owner_slack_id: owner.id, owner_name: owner.name, slack_channel_id: channel.id, slack_channel_name: channel.name,
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
        <div className="space-y-2"><Label htmlFor="prototype-url">Prototype URL</Label><div className="flex gap-2"><Input id="prototype-url" value={url} onChange={(event) => setUrl(event.target.value)} onBlur={() => void checkUrl()} placeholder="https://your-prototype.example.com" type="url" required /><Button type="button" variant="outline" onClick={() => void checkUrl()} disabled={checking}>{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{checking ? "Checking" : "Check"}</Button></div>{check ? <div className={cn("rounded-lg border px-3 py-2.5 text-sm", check.embeddable ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-200")}><div className="flex items-center justify-between gap-3"><span className="font-medium">{check.embeddable ? "Ready to embed" : "Will open in a new tab"}</span><Badge variant="outline" className="bg-background/60">{check.requires_sign_in ? "Sign-in detected" : check.embeddable ? "Live" : "New tab"}</Badge></div><p className="mt-1 text-xs opacity-80">{check.reason}</p></div> : null}</div>
        <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="prototype-name">Name</Label><Input id="prototype-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Treasury dashboard" required /></div><div className="space-y-2"><Label>Owner</Label><SearchSelect placeholder="Choose an owner" searchPlaceholder="Search people…" value={owner?.name ?? ""} options={directory.users.map((person) => ({ key: person.id, label: person.name, detail: person.id, item: person }))} loading={directory.loading} onChange={(selected) => setOwner(selected.item)} /></div></div>
        <div className="space-y-2"><Label>Slack channel</Label><SearchSelect placeholder="Choose a channel" searchPlaceholder="Search channels…" value={channel ? `#${channel.name}` : ""} options={directory.channels.map((item) => ({ key: item.id, label: `#${item.name}`, detail: item.is_private ? "Private" : "Public", item }))} loading={directory.loading} onChange={(selected) => setChannel(selected.item)} /></div>
        <div className="space-y-2"><Label htmlFor="prototype-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="prototype-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should reviewers pay attention to?" className="flex min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div>
        {directory.error ? <p className="text-sm text-amber-700 dark:text-amber-300">Slack directory unavailable. Make sure the directory function is deployed.</p> : null}
        {formError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{formError}</p> : null}
        <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || checking}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Add prototype"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

type Option<T> = { key: string; label: string; detail: string; item: T };

function SearchSelect<T>({ placeholder, searchPlaceholder, value, options, loading, onChange }: { placeholder: string; searchPlaceholder: string; value: string; options: Option<T>[]; loading: boolean; onChange: (option: Option<T>) => void }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.label === value), [options, value]);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal"><span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command><CommandInput placeholder={searchPlaceholder} /><CommandList><CommandEmpty>{loading ? "Loading…" : "Nothing found."}</CommandEmpty><CommandGroup>{options.map((option) => <CommandItem key={option.key} value={`${option.label} ${option.detail}`} onSelect={() => { onChange(option); setOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selected?.key === option.key ? "opacity-100" : "opacity-0")} /><span className="truncate">{option.label}</span><span className="ml-auto text-xs text-muted-foreground">{option.detail}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>;
}
