import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoBanner } from "@/components/ui/info-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPrototypeUrl, normalizeUrl } from "@/lib/checkUrl";
import { isDemoMode } from "@/lib/demoMode";
import { updateDemoPrototype } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { PrototypeSummary } from "@/lib/types";

// Shows the link a prototype was saved with and lets anyone fix it, for when a
// site moves (a renamed repo, a new Pages address) and the frame starts to 404.
// The new link is checked again, so the frame or new-tab choice stays right.
export function EditLinkDialog({ prototype, open, onOpenChange, onSaved }: { prototype: PrototypeSummary; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [url, setUrl] = useState(prototype.url);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUrl(prototype.url);
    setFormError(null);
  }, [open, prototype.url]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) { setFormError("Enter the prototype's link."); return; }
    setSaving(true); setFormError(null);
    const result = await checkPrototypeUrl(normalized);
    if ("error" in result) { setFormError(result.error); setSaving(false); return; }
    const fields = { url: normalized, embed_mode: result.check.embeddable ? "live" as const : "new_tab" as const, embed_reason: result.check.reason, favicon_url: result.check.favicon_url };
    if (isDemoMode) {
      updateDemoPrototype(prototype.id, fields);
    } else {
      const { error } = await supabase?.from("prototypes").update(fields).eq("id", prototype.id) ?? { error: new Error("Supabase is not configured.") };
      if (error) { setFormError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    onOpenChange(false);
    toast.success(fields.embed_mode === "live" ? "Link updated" : `Link updated. It will open in a new tab: ${result.check.reason}`);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Prototype link</DialogTitle><DialogDescription>The address the frame and the Open button load. If the site has moved, paste its new address.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <div className="space-y-2"><Label htmlFor="prototype-link">Link</Label><Input id="prototype-link" value={url} onChange={(event) => setUrl(event.target.value)} type="url" required /></div>
          {formError ? <InfoBanner type="danger">{formError}</InfoBanner> : null}
          <DialogFooter><Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" size="lg" disabled={saving || normalizeUrl(url) === prototype.url}>{saving ? <Loader2 className="animate-spin" /> : null}{saving ? "Checking…" : "Save link"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
