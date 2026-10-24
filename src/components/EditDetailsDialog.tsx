import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfoBanner } from "@/components/ui/info-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isDemoMode } from "@/lib/demoMode";
import { addDemoComment, updateDemoCommentBody, updateDemoPrototype } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { CommentRecord, PrototypeSummary } from "@/lib/types";

// Changes a prototype's name and description. The description is also the
// builder's pinned first comment (descriptionComment.ts), so that comment is
// kept in step: edited when it exists, posted when the builder adds a first
// description.
export function EditDetailsDialog({ prototype, descriptionComment, open, onOpenChange, onSaved }: { prototype: PrototypeSummary; descriptionComment: CommentRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(prototype.name);
  const [description, setDescription] = useState(prototype.description ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isBuilder = Boolean(user && (user.id === prototype.owner_id || user.id === prototype.created_by));

  useEffect(() => {
    if (!open) return;
    setName(prototype.name);
    setDescription(prototype.description ?? "");
    setFormError(null);
  }, [open, prototype.name, prototype.description]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setFormError("Give the prototype a name."); return; }
    const nextDescription = description.trim() || null;
    setSaving(true); setFormError(null);
    const fields = { name: name.trim(), description: nextDescription };
    let commentWarning: string | null = null;

    if (isDemoMode) {
      updateDemoPrototype(prototype.id, fields);
      if (nextDescription && descriptionComment) updateDemoCommentBody(descriptionComment.id, nextDescription);
      else if (nextDescription && isBuilder) addDemoComment({ prototype_id: prototype.id, body: nextDescription, page_url: null, screen_label: null, viewport: null, x_pct: null, y_pct: null, selector: null, scroll_y: null, snapshot_url: null });
    } else {
      if (!supabase || !user) { setSaving(false); return; }
      const { error } = await supabase.from("prototypes").update(fields).eq("id", prototype.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
      if (nextDescription && nextDescription !== prototype.description?.trim()) {
        const result = descriptionComment
          ? await supabase.from("comments").update({ body: nextDescription }).eq("id", descriptionComment.id)
          : isBuilder ? await supabase.from("comments").insert({ prototype_id: prototype.id, author_id: user.id, body: nextDescription }) : { error: null };
        if (result.error) commentWarning = result.error.message;
      }
    }

    setSaving(false);
    onOpenChange(false);
    if (commentWarning) toast.error(`Details saved, but the pinned description comment could not be updated: ${commentWarning}`);
    else toast.success("Details saved");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit details</DialogTitle><DialogDescription>The name shows on its card and page. The description is pinned to the top of its comments.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <div className="space-y-2"><Label htmlFor="prototype-edit-name">Name</Label><Input id="prototype-edit-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="prototype-edit-description">Description <span className="font-normal text-abyss-5">(optional)</span></Label><Textarea id="prototype-edit-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></div>
          {prototype.source === "mantl" ? <InfoBanner type="grayscale">Sharing this prototype again from Prototyping in MANTL replaces its name and description with the ones from the share.</InfoBanner> : null}
          {formError ? <InfoBanner type="danger">{formError}</InfoBanner> : null}
          <DialogFooter><Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" size="lg" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null}{saving ? "Saving…" : "Save details"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
