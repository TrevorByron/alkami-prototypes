import { Code2, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordView } from "@/lib/activity";
import type { PrototypeSummary } from "@/lib/types";

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

// What their viewer page shows where the frame would be: the gallery
// thumbnail and the same links as the library card. The comments sit beside it.
export function NewTabStage({ prototype }: { prototype: PrototypeSummary }) {
  return (
    <Card className="mt-6 w-full max-w-2xl overflow-hidden shadow-pixel">
      {prototype.thumbnail_url ? <a href={prototype.url} target="_blank" rel="noopener noreferrer" onClick={() => void recordView(prototype.id)} aria-label={`Open ${prototype.name} in a new tab`}><img src={prototype.thumbnail_url} alt="" className="max-h-96 w-full border-b-2 border-carbon-2 object-cover object-left-top" /></a> : null}
      <div className="space-y-4 p-6">
        <p className="text-sm text-abyss-5">This prototype opens in its own tab. If GitHub asks, sign in there to view it. Leave feedback in the comments here.</p>
        <div className="flex flex-wrap gap-2 [&_svg]:!h-4 [&_svg]:!w-4"><NewTabLinks prototype={prototype} /></div>
      </div>
    </Card>
  );
}
