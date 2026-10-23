import { useState } from "react";
import { ArrowLeft, ChevronDown, ExternalLink, Link2, Loader2, LockKeyhole, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { EditLinkDialog } from "@/components/EditLinkDialog";
import { TagPicker } from "@/components/TagEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { deletePrototype } from "@/hooks/usePrototypes";
import type { Platform } from "@/lib/platforms";
import type { PrototypeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  prototype: PrototypeSummary;
  platform: Platform | null;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  // Null when the prototype can't be framed, so there is nothing to sign in to here.
  onSignIn: (() => void) | null;
  onOpen: () => void;
  onLinkSaved: () => void;
  onDeleted: () => void;
};

// The viewer's prototype actions, gathered in one menu. Tags are edited inside
// the menu; the link and delete open their own dialogs.
export function PrototypeActionsMenu({ prototype, platform, tags, onTagsChange, onSignIn, onOpen, onLinkSaved, onDeleted }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"actions" | "tags">("actions");
  const [linkOpen, setLinkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Close the menu first, then run the action, so a dialog never opens under it.
  const choose = (action: () => void) => () => { setMenuOpen(false); action(); };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={(next) => { setMenuOpen(next); if (!next) setView("actions"); }}>
        <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="Prototype actions">Actions<ChevronDown /></Button></PopoverTrigger>
        <PopoverContent align="end" className={cn("p-1", view === "tags" ? "w-80" : "w-56")}>
          {view === "tags" ? (
            <div className="space-y-2 p-2">
              <button type="button" className="flex items-center gap-1 text-xs text-abyss-5 hover:text-abyss-9" onClick={() => setView("actions")}><ArrowLeft className="h-4 w-4" />Back</button>
              <TagPicker prototypeId={prototype.id} tags={tags} onChange={onTagsChange} />
            </div>
          ) : (
            <div role="menu" aria-label="Prototype actions">
              {onSignIn ? <MenuItem icon={<LockKeyhole />} onClick={choose(onSignIn)}>Sign in</MenuItem> : null}
              <MenuItem icon={<Tag />} onClick={() => setView("tags")}>{tags.length ? "Edit tags" : "Add tags"}</MenuItem>
              <MenuItem icon={<ExternalLink />} onClick={choose(onOpen)}>{platform ? `Open in ${platform.name}` : "Open in new tab"}</MenuItem>
              <MenuItem icon={<Link2 />} onClick={choose(() => setLinkOpen(true))}>Edit link</MenuItem>
              <div className="my-1 border-t border-carbon-2" />
              <MenuItem icon={<Trash2 />} danger onClick={choose(() => setDeleteOpen(true))}>Delete prototype</MenuItem>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <EditLinkDialog prototype={prototype} open={linkOpen} onOpenChange={setLinkOpen} onSaved={onLinkSaved} />
      <DeletePrototypeDialog id={prototype.id} name={prototype.name} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={onDeleted} />
    </>
  );
}

function MenuItem({ icon, danger = false, onClick, children }: { icon: React.ReactNode; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="menuitem" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm [&_svg]:h-4 [&_svg]:w-4", danger ? "text-chaparral-6 hover:bg-chaparral-0" : "text-abyss-9 hover:bg-carbon-0 [&_svg]:text-abyss-5")}>{icon}{children}</button>;
}

// Deletes the prototype after a confirmation, then leaves the viewer.
function DeletePrototypeDialog({ id, name, open, onOpenChange, onDeleted }: { id: string; name: string; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: () => void }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const error = await deletePrototype(id, Boolean(user));
    setDeleting(false);
    if (error) {
      toast.error(error);
      return;
    }
    onOpenChange(false);
    toast.success("Prototype deleted");
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete this prototype?</DialogTitle><DialogDescription>This will remove <span className="font-medium text-abyss-9">{name}</span> from the shared library and delete its comments and replies. This cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter><Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button><Button type="button" variant="danger" size="lg" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}{deleting ? "Deleting…" : "Delete prototype"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
