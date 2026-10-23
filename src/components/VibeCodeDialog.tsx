import type * as React from "react";
import { ArrowRight, ArrowUp, Download, ExternalLink, FileArchive, FolderOpen, MessageSquare, Sparkles, Terminal } from "lucide-react";

import { ClaudeMark } from "@/components/ClaudeMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const repositoryUrl = "https://github.com/myfintech/prototyping-in-mantl";
// The zip itself, not the releases page, so the button starts the download.
const templateDownloadUrl = `${repositoryUrl}/releases/download/latest/prototyping-in-mantl.zip`;
const folderName = "prototyping-in-mantl";

const link = "text-marine-5 underline hover:text-marine-6";
const code = "rounded bg-carbon-1 px-1 text-xs text-abyss-7";

export function VibeCodeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="shrink-0">
          <Sparkles />
          Vibe Code in MANTL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none gap-0 p-0" style={{ width: "min(calc(100% - 2rem), 60rem)" }}>
        <div className="border-b border-carbon-3 bg-carbon-0 px-6 pb-6 pt-6 pr-14 sm:px-8">
          <Badge variant="default" className="mb-3">MANTL design playground</Badge>
          <DialogHeader>
            <DialogTitle className="max-w-2xl">How to use this</DialogTitle>
            <DialogDescription className="mt-1 max-w-2xl">Four steps from an idea to a clickable prototype everyone can open. No GitHub knowledge needed.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <a href={templateDownloadUrl}>
                <Download />
                Download the template
              </a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href={repositoryUrl} target="_blank" rel="noreferrer">
                View on GitHub
                <ExternalLink />
              </a>
            </Button>
          </div>
        </div>

        {/* The steps sit on the dark marine canvas so they read as the main event. */}
        <ol className="canvas-dark grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <Step number={1} title="Download and unzip the template" visual={<UnzipVisual />}>
            <a href={templateDownloadUrl} className={link}>Download Prototyping in MANTL</a>, then double-click the zip to unzip it. You get a folder called <code className={code}>{folderName}</code>. Keep it somewhere easy to find, like Downloads.
          </Step>
          <Step number={2} title="Point Claude at the folder" visual={<OpenFolderVisual />}>
            <b>In the Claude desktop app:</b> open the <b>Code</b> tab and choose the <code className={code}>{folderName}</code> folder as the one to work in. <b>Or in a terminal:</b> go into the folder and run <code className={code}>claude</code>. Claude reads the folder’s instructions from there.
          </Step>
          <Step number={3} title="Type “get this running” into Claude" visual={<ChatVisual prompt="get this running" reply="Starting the real Console with sample data…" />}>
            Claude installs what it needs and opens the Console in your browser; the first run takes a few minutes. Then tell Claude what you want to try, in plain words, and drop in a screenshot or sketch if you have one.
          </Step>
          <Step number={4} title="Type “share this” to publish it" visual={<ChatVisual prompt="share this" reply="Shared. Look for it under MANTL vibe codes." />}>
            Sign in to GitHub when Claude asks, the first time only. Once it’s shared, a link to your prototype shows up right here on Alkami Prototypes, in the <b>MANTL vibe codes</b> section, next to its handoff notes and code. Running <code className={code}>pnpm share</code> does the same.
          </Step>
        </ol>

        <div className="flex items-start gap-2 border-t border-carbon-3 px-6 py-4 text-xs text-abyss-5 sm:px-8 [&_b]:font-bold [&_b]:text-abyss-9">
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Sharing again updates the same card. Type <b>“archive this”</b> into Claude to take a preview down; the code stays on GitHub.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, visual, children }: { number: number; title: string; visual: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2">
      <span className="font-pixel text-xs uppercase text-marine-2">Step {number}</span>
      <Card className="flex flex-1 flex-col overflow-hidden shadow-pixel">
        <div className="border-b-2 border-carbon-2 bg-carbon-0 p-4" aria-hidden>{visual}</div>
        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-base text-abyss-9">{title}</h3>
          <p className="text-sm leading-5 text-abyss-5 [&_b]:font-bold [&_b]:text-abyss-9">{children}</p>
        </div>
      </Card>
    </li>
  );
}

// The zip turning into a folder.
function UnzipVisual() {
  return (
    <div className="flex h-24 items-center justify-center gap-3 text-xs text-abyss-7">
      <span className="pixel-notch flex min-w-0 items-center gap-2 bg-abyss-0 px-3 py-2"><FileArchive className="h-5 w-5 shrink-0 text-desert-6" /><span className="truncate">{folderName}.zip</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-abyss-5" />
      <span className="pixel-notch flex min-w-0 items-center gap-2 bg-marine-0 px-3 py-2 text-marine-8"><FolderOpen className="h-5 w-5 shrink-0 text-marine-5" /><span className="truncate">{folderName}</span></span>
    </div>
  );
}

// The two ways to open the folder: the Claude app's folder picker, or a terminal.
function OpenFolderVisual() {
  return (
    <div className="grid h-24 grid-cols-2 gap-2 text-xs">
      <div className="flex flex-col overflow-hidden rounded border border-claude-border bg-claude-cream">
        <div className="flex items-center gap-1 border-b border-claude-border px-2 py-1 text-claude-ink"><ClaudeMark className="h-3.5 w-3.5 rounded-sm" />Claude<span className="ml-auto rounded bg-claude-sand px-1">Code</span></div>
        <div className="flex flex-1 items-center justify-center px-2">
          <span className="flex min-w-0 items-center gap-1 rounded border border-claude-border bg-abyss-0 px-2 py-1 text-claude-ink"><FolderOpen className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{folderName}</span></span>
        </div>
      </div>
      <div className="flex flex-col overflow-hidden rounded bg-abyss-9 text-abyss-0">
        <div className="flex items-center gap-1 border-b border-abyss-7 px-2 py-1 text-abyss-3"><Terminal className="h-3.5 w-3.5" />Terminal</div>
        <div className="flex flex-1 flex-col justify-center gap-1 px-2 leading-4">
          <span className="truncate"><span className="text-tiaga-4">$</span> cd {folderName}</span>
          <span><span className="text-tiaga-4">$</span> claude</span>
        </div>
      </div>
    </div>
  );
}

// A Claude prompt box holding the phrase to type, with Claude's reply above it.
function ChatVisual({ prompt, reply }: { prompt: string; reply: string }) {
  return (
    <div className="flex h-24 flex-col justify-end gap-2 text-xs">
      <div className="flex items-center gap-2 text-claude-ink"><ClaudeMark className="h-4 w-4 rounded-sm" /><span className="truncate">{reply}</span></div>
      <div className="flex items-center gap-2 rounded-lg border border-claude-border bg-abyss-0 py-1.5 pl-3 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-sm text-abyss-9">{prompt}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-claude text-abyss-0"><ArrowUp className="h-4 w-4" /></span>
      </div>
    </div>
  );
}
