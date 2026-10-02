import { ExternalLink, Globe, LockKeyhole, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { InfoBanner } from "@/components/ui/info-banner";
import type { Platform, PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

// Brand styling and copy for each prototyping tool. Class strings are written
// out in full so Tailwind can find them.
const brands: Record<PlatformId, {
  mark: string;
  markTile: string;
  surface: string;
  fade: string;
  border: string;
  soft: string;
  accent: string;
  ink: string;
  button: string;
  groupButton: string;
  badge: string;
  thing: string;
  panelTitle: (platform: Platform) => string;
  panelBody: string;
  access: (platform: Platform) => string;
}> = {
  claude: {
    mark: "/claude-mark.png",
    markTile: "",
    surface: "bg-gradient-to-br from-claude-cream via-claude-cream to-claude-sand",
    fade: "from-claude-cream via-claude-cream/95",
    border: "border-claude-border",
    soft: "bg-claude-sand",
    accent: "bg-claude/30",
    ink: "text-claude-ink",
    button: "bg-claude hover:bg-claude-dark active:bg-claude-ink",
    groupButton: "bg-claude group-hover/brand:bg-claude-dark",
    badge: "bg-claude-sand text-claude-ink",
    thing: "Claude artifact",
    panelTitle: () => "This is a Claude artifact",
    panelBody: "Claude artifacts can only be viewed on claude.ai, so this one opens in a new tab. Come back here to leave comments.",
    access: (platform) => platform.access === "public"
      ? "Published publicly. Anyone with the link can open it, no Claude account needed."
      : "Shared privately. You’ll need to be signed in to Claude with access to this artifact. If you see a no-access page, ask the builder to share it with you or publish it.",
  },
  replit: {
    mark: "/replit-mark.png",
    markTile: "border border-replit-border bg-abyss-0 p-1.5",
    surface: "bg-gradient-to-br from-replit-cream via-replit-cream to-replit-sand",
    fade: "from-replit-cream via-replit-cream/95",
    border: "border-replit-border",
    soft: "bg-replit-sand",
    accent: "bg-replit/30",
    ink: "text-replit-ink",
    button: "bg-replit hover:bg-replit-dark active:bg-replit-ink",
    groupButton: "bg-replit group-hover/brand:bg-replit-dark",
    badge: "bg-replit-sand text-replit-ink",
    thing: "Replit app",
    panelTitle: (platform) => platform.access === "public" ? "This is a Replit app" : "This is a private Replit app",
    panelBody: "Private Replit deployments only open for people signed in to Replit with access, so this one opens in a new tab. Come back here to leave comments.",
    access: () => "You’ll need to be signed in to Replit with an account that has access. If you land on Replit’s sign-in or no-access page, ask the builder to invite you or make the deployment public.",
  },
};

export function PlatformMark({ platform, className = "h-10 w-10" }: { platform: Platform; className?: string }) {
  const brand = brands[platform.id];
  return <img src={brand.mark} alt="" className={cn("shrink-0 rounded-lg object-contain", brand.markTile, className)} />;
}

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return <span className={cn("inline-flex min-h-5 items-center whitespace-nowrap rounded px-2 text-xs leading-4", brands[platform.id].badge, className)}>{brands[platform.id].thing}</span>;
}

// Card thumbnail for prototypes that can't be framed: a stylised app window in
// the tool's colours that opens the real thing in a new tab.
export function PlatformPreview({ platform, url }: { platform: Platform; url: string }) {
  const brand = brands[platform.id];
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn("group/brand relative block h-36 overflow-hidden border-b border-carbon-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-marine-2", brand.surface)} aria-label={`Open the ${brand.thing} in a new tab`}>
      <div className={cn("absolute inset-x-6 top-5 rounded-lg border bg-abyss-0 shadow-tropo transition-transform duration-200 group-hover/brand:-translate-y-0.5", brand.border)} aria-hidden>
        <div className={cn("flex items-center gap-2 border-b px-3 py-2", brand.border)}><PlatformMark platform={platform} className="h-4 w-4 !rounded !border-0 !p-0" /><span className={cn("h-1.5 w-20 rounded-full", brand.soft)} /></div>
        <div className="space-y-2 px-3 py-3"><span className={cn("block h-2 w-2/3 rounded-full", brand.accent)} /><span className={cn("block h-2 w-1/2 rounded-full", brand.soft)} /><span className={cn("block h-2 w-3/4 rounded-full", brand.soft)} /></div>
      </div>
      <div className={cn("absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t to-transparent px-6 pb-3 pt-6", brand.fade)}>
        <span className={cn("flex items-center gap-1 text-xs", brand.ink)}>{platform.access === "public" ? <Globe className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}{platform.access === "public" ? "Anyone with the link" : `Needs ${platform.name} access`}</span>
        <span className={cn("inline-flex min-h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-abyss-0 transition-colors", brand.groupButton)}>Opens in a new tab<ExternalLink className="h-4 w-4" /></span>
      </div>
    </a>
  );
}

// Viewer panel shown instead of the frame.
export function PlatformPanel({ platform, onOpen, onComment }: { platform: Platform; onOpen: () => void; onComment: () => void }) {
  const brand = brands[platform.id];
  return (
    <Card className="mt-10 w-full max-w-lg overflow-hidden text-center">
      <div className={cn("px-8 pb-6 pt-8", brand.surface)}><PlatformMark platform={platform} className="mx-auto h-12 w-12" /><CardTitle className="mt-4">{brand.panelTitle(platform)}</CardTitle><CardDescription className="mt-1">{brand.panelBody}</CardDescription></div>
      <div className="border-t border-carbon-3 px-8 py-6">
        <InfoBanner type={platform.access === "public" ? "success" : "warning"} className="text-left">{brand.access(platform)}</InfoBanner>
        <div className="mt-6 flex justify-center gap-2"><Button size="lg" className={brand.button} onClick={onOpen}><ExternalLink />Open in {platform.name}</Button><Button variant="secondary" size="lg" onClick={onComment}><MessageSquare />Add comment</Button></div>
      </div>
    </Card>
  );
}
