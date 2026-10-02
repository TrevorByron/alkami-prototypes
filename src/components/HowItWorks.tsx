import type * as React from "react";
import { CircleHelp, ExternalLink, Image, LockKeyhole, MessageSquare, MonitorSmartphone, MoreVertical, Plus, Search, Tag, ThumbsUp } from "lucide-react";

import { ClaudeMark } from "@/components/ClaudeMark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { prototypeTags } from "@/lib/tags";

// The "How this works" drawer in the site header. Copy reflects what the app
// does today; update it alongside any feature that changes these steps.
export function HowItWorks() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost"><CircleHelp /><span className="hidden sm:inline">How this works</span></Button>
      </SheetTrigger>
      <SheetContent className="w-[min(100%,30rem)]">
        <div className="border-b border-carbon-3 px-6 pb-4 pt-6 pr-14">
          <SheetTitle>Welcome to the builders club 🛠️</SheetTitle>
          <SheetDescription className="mt-1">One shared space for whatever people at Alkami are making. Share it, poke at it, leave a note.</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm text-abyss-7">
          <Section title="What is this place?">
            <p>It's a library of prototypes from across the company, with comments on each one. It is not a review gate or an approval queue. Half-built is welcome. Built on a Friday for fun is welcome (we even have a tag for it).</p>
          </Section>

          <Section title="How do I share something?">
            <Steps>
              <Step icon={<Plus />}>Click <b>Add prototype</b> and paste the link.</Step>
              <Step icon={<Search />}>Hit <b>Check</b>. We work out whether it can show live inside the app or needs to open in a new tab.</Step>
              <Step icon={<Tag />}>Give it a name and click any tags that fit. You can change tags later.</Step>
            </Steps>
            <div className="mt-2 flex flex-wrap gap-1">{prototypeTags.map((tag) => <span key={tag.id} className="inline-flex min-h-5 items-center gap-1 rounded bg-carbon-1 px-2 text-xs text-abyss-7"><span aria-hidden>{tag.emoji}</span>{tag.label}</span>)}</div>
          </Section>

          <Section title="Does my link have to be public?">
            <p>Mostly no. The rule of thumb: if your teammates can open the link in their browser, it works here.</p>
            <ul className="mt-2 space-y-2">
              <Bullet icon={<MonitorSmartphone />} title="Shows live in the frame">Vercel, Netlify and most hosted sites. People click around right inside the app.</Bullet>
              <Bullet icon={<LockKeyhole />} title="Needs a sign-in">GitLab Pages and other gated sites. Viewers hit <b>Sign in</b> once, then it loads. Some browsers block that, so <b>Open</b> in a new tab is always there.</Bullet>
              <Bullet icon={<ExternalLink />} title="Opens in a new tab">Sites that refuse to be embedded. Still totally fine, the comments still live here.</Bullet>
            </ul>
          </Section>

          <Section title="Built it in Claude?">
            <div className="flex items-start gap-2 rounded-lg border border-claude-border bg-claude-cream p-4">
              <ClaudeMark className="h-8 w-8" />
              <div className="space-y-2">
                <p>Yes, share it here. Claude artifacts always open on claude.ai in a new tab (Claude doesn't allow them inside other sites), and comments happen here.</p>
                <p><b>Publish it first</b> so everyone can see it: in Claude, open the artifact, choose <b>Publish</b>, and copy the public link (it starts with <code className="rounded bg-claude-sand px-1 text-xs">claude.ai/public/</code>). Private links only work for people you've shared it with.</p>
              </div>
            </div>
          </Section>

          <Section title="Built it in Replit?">
            <div className="flex items-start gap-2 rounded-lg border border-replit-border bg-replit-cream p-4">
              <img src="/replit-mark.png" alt="" className="h-8 w-8 shrink-0 rounded-lg border border-replit-border bg-abyss-0 p-1.5" />
              <div className="space-y-2">
                <p>Paste the deployment link (the <code className="rounded bg-replit-sand px-1 text-xs">.replit.app</code> one). Public deployments show live right in the frame.</p>
                <p>Private deployments open in a new tab, and only for people signed in to Replit with access. <b>Make the deployment public</b> if you want everyone to see it.</p>
              </div>
            </div>
          </Section>

          <Section title="How do I give feedback?">
            <Steps>
              <Step icon={<MessageSquare />}>Open any prototype and write a comment on the right. <b>⌘↵</b> posts it.</Step>
              <Step icon={<Image />}>Drag in a screenshot to point at the exact thing you mean. Click any image to see it full screen.</Step>
              <Step icon={<ThumbsUp />}>Upvote the comments you agree with, and sort by <b>Popular</b> to see what matters most.</Step>
              <Step icon={<MoreVertical />}>Reply to keep the conversation going. Once it's handled, the builder (or whoever left the comment) resolves it from the ⋮ menu.</Step>
            </Steps>
            <p className="mt-2 text-xs text-abyss-5">Desktop, Tablet and Mobile at the top let you check how a prototype holds up at each size.</p>
          </Section>

          <Section title="Not sure where to start?">
            <ul className="list-disc space-y-1 pl-5">
              <li>Share the thing you've been tinkering with. Tag it 🎉 Just for fun if that's what it is.</li>
              <li>Leave one comment on somebody else's prototype today.</li>
              <li>Upvote the comment you wish you'd written.</li>
              <li>See a screen you'd do differently? Build your version and post it.</li>
            </ul>
          </Section>
        </div>

        <div className="border-t border-carbon-3 bg-carbon-0 px-6 py-4 text-xs text-abyss-5">Questions or ideas for this space? Message <b className="font-medium text-abyss-9">@trevor.borden</b> on Slack.</div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-base font-medium text-abyss-9">{title}</h3>{children}</section>;
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-2">{children}</ol>;
}

function Step({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-marine-0 text-marine-5 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>{icon}</span><span className="pt-0.5 [&_b]:font-medium [&_b]:text-abyss-9">{children}</span></li>;
}

function Bullet({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-abyss-5 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>{icon}</span><span className="[&_b]:font-medium [&_b]:text-abyss-9"><span className="font-medium text-abyss-9">{title}.</span> {children}</span></li>;
}
