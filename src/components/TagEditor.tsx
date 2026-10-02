import { useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectionPill } from "@/components/ui/selection-pill";
import { isDemoMode } from "@/lib/demoMode";
import { updateDemoPrototypeTags } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import { prototypeTags } from "@/lib/tags";

// Edit a prototype's tags in place. Each click saves immediately and the
// parent is told the new list, so callers can update without a full reload.
export function TagEditor({ prototypeId, tags, onChange, trigger }: { prototypeId: string; tags: string[]; onChange: (tags: string[]) => void; trigger?: React.ReactNode }) {
  const [saving, setSaving] = useState(false);

  async function toggle(id: string) {
    const previous = tags;
    const next = tags.includes(id) ? tags.filter((tag) => tag !== id) : [...tags, id];
    onChange(next);
    if (isDemoMode) { updateDemoPrototypeTags(prototypeId, next); return; }
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("prototypes").update({ tags: next }).eq("id", prototypeId);
    setSaving(false);
    if (error) { onChange(previous); toast.error(error.message); }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger ?? <Button variant="outline" size="sm"><Tag /><span className="hidden sm:inline">{tags.length ? "Edit tags" : "Add tags"}</span></Button>}</PopoverTrigger>
      <PopoverContent align="end" className="w-80" onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-abyss-9">Tags</p>{saving ? <Loader2 className="h-4 w-4 animate-spin text-abyss-5" aria-label="Saving" /> : <span className="text-xs text-abyss-5">Saves as you click</span>}</div>
        <div className="flex flex-wrap gap-2">{prototypeTags.map((tag) => <SelectionPill key={tag.id} selected={tags.includes(tag.id)} title={tag.hint} onClick={() => void toggle(tag.id)}><span aria-hidden>{tag.emoji}</span>{tag.label}</SelectionPill>)}</div>
      </PopoverContent>
    </Popover>
  );
}
