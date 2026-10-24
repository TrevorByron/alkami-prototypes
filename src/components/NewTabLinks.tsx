import { Code2, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordView } from "@/lib/activity";
import type { PrototypeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// The ways into a prototype that opens in its own tab: the site itself, and
// for Prototyping in MANTL its handoff notes and code. Each opens a new tab;
// the external-link icon on Open says so, where the library's in-app Open
// (to the viewer) has no icon.
export function NewTabLinks({ prototype, size }: { prototype: PrototypeSummary; size?: "lg" }) {
  const meta = prototype.source === "mantl" ? prototype.source_meta : null;
  return (
    <>
      <Button asChild size={size}><a href={prototype.url} target="_blank" rel="noopener noreferrer" onClick={() => void recordView(prototype.id)} aria-label={`Open ${prototype.name} in a new tab`}><ExternalLink />Open</a></Button>
      {meta?.handoff_url ? <Button asChild variant="outline" size={size}><a href={meta.handoff_url} target="_blank" rel="noopener noreferrer"><FileText />Handoff</a></Button> : null}
      {meta?.code_url ? <Button asChild variant="outline" size={size}><a href={meta.code_url} target="_blank" rel="noopener noreferrer"><Code2 />Code</a></Button> : null}
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
