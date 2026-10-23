import { CloudUpload, Download, ExternalLink, MessageSquare, Sparkles, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const repositoryUrl = "https://github.com/myfintech/prototyping-in-mantl";
// The zip itself, not the releases page, so the button starts the download.
const templateDownloadUrl = `${repositoryUrl}/releases/download/latest/prototyping-in-mantl.zip`;
// Where shared prototypes are listed once they are published.
const galleryUrl = "https://animated-adventure-rkg3o2j.pages.github.io/";

const steps = [
  {
    icon: Download,
    title: "Get the template",
    body: <><a href={templateDownloadUrl} className="text-marine-5 underline hover:text-marine-6">Download Prototyping in MANTL</a>, unzip it, and open the folder in Claude Code.</>,
  },
  {
    icon: WandSparkles,
    title: "Build your idea",
    body: <>Say <b>“get this running”</b>, then describe what you want to try. It takes shape in the real Console, with real data.</>,
  },
  {
    icon: CloudUpload,
    title: "Share it",
    body: <>Say <b>“share this”</b> (or run <code className="rounded bg-carbon-1 px-1 text-xs text-abyss-7">pnpm share</code>). Sign in to GitHub the first time. About 15 minutes later it is listed in the <a href={galleryUrl} target="_blank" rel="noreferrer" className="text-marine-5 underline hover:text-marine-6">MANTL gallery</a>.</>,
  },
];

export function VibeCodeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="shrink-0">
          <Sparkles />
          Vibe Code in MANTL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none p-0" style={{ width: "min(calc(100% - 2rem), 56rem)" }}>
        <div className="border-b border-carbon-3 bg-carbon-0 px-6 pb-6 pt-6 pr-14 sm:px-8">
          <Badge variant="default" className="mb-3">MANTL design playground</Badge>
          <DialogHeader>
            <DialogTitle className="max-w-2xl">How to use this</DialogTitle>
            <DialogDescription className="mt-1 max-w-2xl">Three steps from an idea to a clickable prototype everyone can open. No GitHub knowledge needed.</DialogDescription>
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

        <ol className="grid gap-4 px-6 py-6 sm:grid-cols-3 sm:px-8">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-marine-5">Step {index + 1}</span>
              <Card className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-marine-0 text-marine-5"><Icon className="h-5 w-5" /></div>
                <h3 className="text-base text-abyss-9">{title}</h3>
                <p className="text-sm leading-5 text-abyss-5 [&_b]:font-bold [&_b]:text-abyss-9">{body}</p>
              </Card>
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-2 border-t border-carbon-3 px-6 py-4 text-xs text-abyss-5 sm:px-8 [&_b]:font-bold [&_b]:text-abyss-9">
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Sharing again updates the same card. Say <b>“archive this”</b> to take a preview down; the code stays on GitHub.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
