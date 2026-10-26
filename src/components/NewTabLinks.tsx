import * as React from "react";
import { Code2, ExternalLink, FileText, GitFork, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordView } from "@/lib/activity";
import { startDownload } from "@/lib/downloadAsset";
import type { PrototypeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// A square keycap with one icon and a tooltip, the same treatment as the
// Prototyping in MANTL gallery: a 2px border on a solid bottom edge, pressed
// down on click. The tooltip is a sibling, so it shows on hover and on focus.
function IconLink({ href, label, tip, onClick, children }: { href: string; label: string; tip: string; onClick?: (event: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={onClick ? undefined : "_blank"}
      rel={onClick ? undefined : "noopener noreferrer"}
      onClick={onClick}
      aria-label={label}
      className="group/key relative inline-grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-carbon-3 bg-abyss-0 text-abyss-9 shadow-[0_3px_0_0_hsl(var(--color-carbon-3))] transition-colors hover:border-marine-2 hover:text-marine-5 hover:shadow-[0_3px_0_0_hsl(var(--color-marine-2))] focus-visible:border-marine-2 focus-visible:text-marine-5 focus-visible:outline-none focus-visible:shadow-[0_3px_0_0_hsl(var(--color-marine-2))] active:translate-y-[3px] active:shadow-none [&_svg]:h-[18px] [&_svg]:w-[18px]"
    >
      {children}
      <span role="tooltip" className="pixel-notch pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[15rem] -translate-x-1/2 bg-carbon-9 px-2.5 py-1.5 text-center text-xs font-normal leading-4 text-abyss-0 opacity-0 transition-opacity group-hover/key:opacity-100 group-focus-visible/key:opacity-100">{tip}</span>
    </a>
  );
}

// The ways into a prototype that opens in its own tab: Open (the site itself,
// in a new tab, which the external-link icon says), then for Prototyping in
// MANTL three keycaps: its handoff notes, its code, and "Build on this", the
// download of a copy that becomes the reader's own prototype (the library's
// in-app Open, to the viewer, has no icon). An archived prototype has no copy.
export function NewTabLinks({ prototype }: { prototype: PrototypeSummary }) {
  const meta = prototype.source === "mantl" ? prototype.source_meta : null;
  const download = meta?.download_url && !prototype.archived_at ? meta.download_url : null;
  const [pending, setPending] = React.useState(false);
  // Through the download-asset function, so no GitHub sign-in is needed; the
  // GitHub link itself is the href, for a browser that is signed in there.
  const buildOnThis = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (pending || !download || !meta?.name) return;
    setPending(true);
    const result = await startDownload(`${meta.name}.zip`, download);
    setPending(false);
    if (!result.ok) toast.error("The download could not start", { description: result.error });
  };
  return (
    <>
      <Button asChild><a href={prototype.url} target="_blank" rel="noopener noreferrer" onClick={() => void recordView(prototype.id)} aria-label={`Open ${prototype.name} in a new tab`}><ExternalLink />Open</a></Button>
      {meta?.handoff_url ? <IconLink href={meta.handoff_url} label="Handoff" tip="Handoff notes: what was built and how, for engineers"><FileText /></IconLink> : null}
      {meta?.code_url ? <IconLink href={meta.code_url} label="Code" tip={`The code on GitHub${meta.branch ? ` (branch ${meta.branch})` : ""}`}><Code2 /></IconLink> : null}
      {download ? <IconLink href={download} onClick={buildOnThis} label="Build on this" tip="Build on this: downloads a copy of this prototype. Open it in Claude Code and say “share this” to publish your own version.">{pending ? <Loader2 className="animate-spin" /> : <GitFork />}</IconLink> : null}
    </>
  );
}

// Stands in for a missing gallery screenshot: the MANTL mark and the
// prototype's name on the dark marine canvas, so the card still reads as a
// MANTL vibe code instead of an empty grey box.
export function MantlPreview({ prototype, large = false }: { prototype: PrototypeSummary; large?: boolean }) {
  const pages = prototype.source === "mantl" ? prototype.source_meta?.pages : null;
  return (
    <div className={cn("canvas-dark flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center", large && "aspect-video gap-4")}>
      <img src="/mantl-mark.svg" alt="" className={cn("[image-rendering:pixelated]", large ? "h-16 w-16" : "h-10 w-10")} />
      <span className={cn("line-clamp-2 font-bold text-abyss-0", large ? "text-xl" : "text-sm")}>{prototype.name}</span>
      <span className="font-pixel text-xs uppercase text-marine-2">{pages ? `${pages} ${pages === 1 ? "page" : "pages"} · ` : ""}Opens in a new tab</span>
    </div>
  );
}

// What their viewer page shows where the frame would be: the gallery
// screenshot at full width, or the MANTL stand-in, and the same links as the
// library card. Clicking the picture opens the prototype. The comments sit beside it.
export function NewTabStage({ prototype }: { prototype: PrototypeSummary }) {
  return (
    <Card className="mt-6 w-full max-w-4xl overflow-hidden shadow-pixel">
      <a href={prototype.url} target="_blank" rel="noopener noreferrer" onClick={() => void recordView(prototype.id)} aria-label={`Open ${prototype.name} in a new tab`} className="block border-b-2 border-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2">
        {prototype.thumbnail_url ? <img src={prototype.thumbnail_url} alt="" className="block w-full object-cover object-left-top" /> : <MantlPreview prototype={prototype} large />}
      </a>
      <div className="flex flex-wrap items-center gap-4 p-6">
        <p className="min-w-0 flex-1 text-sm text-abyss-5">This prototype opens in its own tab. If GitHub asks, sign in there to view it. Leave feedback in the comments here.</p>
        <div className="flex flex-wrap gap-2 [&_svg]:!h-4 [&_svg]:!w-4"><NewTabLinks prototype={prototype} /></div>
      </div>
    </Card>
  );
}
