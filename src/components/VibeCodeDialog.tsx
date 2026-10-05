import { Boxes, Check, Download, ExternalLink, GitBranch, Sparkles, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const repositoryUrl = "https://github.com/myfintech/mantl-for-prototyping";
const repositoryDownloadUrl = `${repositoryUrl}/archive/refs/heads/main.zip`;

const workflow = [
  {
    number: "01",
    icon: Download,
    title: "Download the Mantl kit",
    description: "Grab a snapshot of the Mantl front end, fake backend, design-system guidance, and Claude Code instructions.",
  },
  {
    number: "02",
    icon: Terminal,
    title: "Ask Claude to get it running",
    description: "Unzip the folder, open it in Claude Code, and say “get this running.” The included CLAUDE.md starts the exploration workflow.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Vibe code the idea",
    description: "Describe what you want to try, attach a screenshot or sketch, and let Claude shape a believable Mantl experience with synthetic data.",
  },
  {
    number: "04",
    icon: GitBranch,
    title: "Get ready for handoff",
    description: "When the direction feels right, say “get ready for dev.” Claude creates a HANDOFF.md and route screenshots for the next conversation.",
  },
];

export function VibeCodeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="shrink-0">
          <Sparkles />
          Vibe Code in Mantl
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0">
        <div className="border-b border-carbon-3 bg-carbon-0 px-6 pb-6 pt-6 pr-14 sm:px-8">
          <Badge variant="default" className="mb-3">Mantl design playground</Badge>
          <DialogHeader>
            <DialogTitle className="max-w-2xl">Explore ideas in the real Mantl look and feel.</DialogTitle>
            <DialogDescription className="mt-1 max-w-2xl">
              Download a ready-to-run Mantl snapshot, bring it into Claude Code, and shape the idea before anyone has to build the production feature.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <a href={repositoryDownloadUrl} download="mantl-for-prototyping-main.zip" aria-label="Download the Mantl for prototyping repository">
                <Download />
                Download the repository
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

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <section aria-labelledby="vibe-code-workflow">
            <div className="mb-3">
              <h2 id="vibe-code-workflow" className="text-base font-medium text-abyss-9">From a rough idea to a handoff-ready direction</h2>
              <p className="mt-1 text-sm text-abyss-5">A simple loop for exploring a Mantl-shaped idea with Claude Code.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map(({ number, icon: Icon, title, description }) => (
                <Card key={number} className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-marine-0 text-marine-5"><Icon className="h-4 w-4" /></div>
                    <span className="text-xs font-medium text-abyss-5">Step {number}</span>
                  </div>
                  <h3 className="text-base font-medium text-abyss-9">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-abyss-5">{description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="mantl-surfaces">
            <div className="mb-3">
              <h2 id="mantl-surfaces" className="text-base font-medium text-abyss-9">Prototype with Mantl components and tokens</h2>
              <p className="mt-1 max-w-2xl text-sm text-abyss-5">The repository includes design-system guidance and checks so Claude can reach for the closest real component instead of inventing a one-off look.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-carbon-0 p-4">
                <div className="mb-2 flex items-center gap-2"><Boxes className="h-5 w-5 text-marine-5" /><h3 className="font-medium text-abyss-9">Console</h3></div>
                <p className="text-sm leading-5 text-abyss-5">The banker and credit-union employee experience, using the <code className="rounded bg-carbon-1 px-1 text-xs text-abyss-7">@/UI</code> components and Console tokens.</p>
              </Card>
              <Card className="bg-carbon-0 p-4">
                <div className="mb-2 flex items-center gap-2"><Boxes className="h-5 w-5 text-tiaga-8" /><h3 className="font-medium text-abyss-9">Self-serve</h3></div>
                <p className="text-sm leading-5 text-abyss-5">The applicant experience, using <code className="rounded bg-carbon-1 px-1 text-xs text-abyss-7">@mantl/self-serve-components</code> across responsive, branded flows.</p>
              </Card>
            </div>
          </section>

          <section className="rounded-lg border border-carbon-3 bg-carbon-0 p-4" aria-labelledby="getting-started">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-tiaga-0 text-tiaga-8"><Check className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h2 id="getting-started" className="text-base font-medium text-abyss-9">A quick start for your first session</h2>
                <p className="mt-1 text-sm text-abyss-5">You need Node 24+, pnpm through Corepack, and macOS or Linux. No Docker, credentials, or real customer data are required.</p>
                <div className="mt-3 grid gap-2 text-xs text-abyss-7 sm:grid-cols-3">
                  <code className="rounded bg-abyss-0 px-3 py-2">pnpm prototype</code>
                  <code className="rounded bg-abyss-0 px-3 py-2">pnpm handoff -- --route /console</code>
                  <code className="rounded bg-abyss-0 px-3 py-2">pnpm stop</code>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
