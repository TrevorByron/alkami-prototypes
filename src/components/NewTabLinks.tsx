import { Link } from "react-router-dom";
import { ArrowLeft, Code2, ExternalLink, FileText } from "lucide-react";

import { AppMark } from "@/components/AppMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PrototypeSummary } from "@/lib/types";

// The ways into a prototype that opens in its own tab: the site itself, and
// for Prototyping in Mantl its handoff notes and code. Each opens a new tab;
// the external-link icon on Open says so, where the library's in-app Open
// (to the viewer) has no icon.
export function NewTabLinks({ prototype, size }: { prototype: PrototypeSummary; size?: "lg" }) {
  const meta = prototype.source === "mantl" ? prototype.source_meta : null;
  return (
    <>
      <Button asChild size={size}><a href={prototype.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${prototype.name} in a new tab`}><ExternalLink />Open</a></Button>
      {meta?.handoff_url ? <Button asChild variant="outline" size={size}><a href={meta.handoff_url} target="_blank" rel="noopener noreferrer"><FileText />Handoff</a></Button> : null}
      {meta?.code_url ? <Button asChild variant="outline" size={size}><a href={meta.code_url} target="_blank" rel="noopener noreferrer"><Code2 />Code</a></Button> : null}
    </>
  );
}

// What an old link to such a prototype's viewer page shows now: no frame and
// no comments, just the same links as its library card.
export function NewTabOnlyPage({ prototype }: { prototype: PrototypeSummary }) {
  return (
    <div className="dot-grid min-h-screen bg-carbon-0">
      <header className="flex h-16 items-center border-b-2 border-carbon-2 bg-abyss-0 px-6">
        <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2"><AppMark /><span className="pixel-cursor whitespace-nowrap font-pixel text-base text-marine-8">Alkami Prototypes</span></Link>
      </header>
      <main className="flex justify-center px-6 py-16">
        <Card className="w-full max-w-lg overflow-hidden shadow-pixel">
          {prototype.thumbnail_url ? <img src={prototype.thumbnail_url} alt="" className="h-48 w-full border-b-2 border-carbon-2 object-cover object-left-top" /> : null}
          <div className="space-y-4 p-6">
            <div>
              <h1 className="text-base text-abyss-9">{prototype.name}</h1>
              <p className="mt-1 text-sm text-abyss-5">This prototype opens in its own tab. If GitHub asks, sign in there to view it.</p>
            </div>
            <div className="flex flex-wrap gap-2 [&_svg]:!h-4 [&_svg]:!w-4"><NewTabLinks prototype={prototype} /></div>
            <Button asChild variant="ghost" className="-ml-2"><Link to="/"><ArrowLeft />Back to the library</Link></Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
