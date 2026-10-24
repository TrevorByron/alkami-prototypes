import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ExternalLink, Eye, Hammer, LayoutGrid, MessageSquare, Plus, RotateCcw, Search, Users } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AddPrototypeDialog } from "@/components/AddPrototypeDialog";
import { AppMark } from "@/components/AppMark";
import { PlatformPreview } from "@/components/Platform";
import { HowItWorks } from "@/components/HowItWorks";
import { NewTabLinks } from "@/components/NewTabLinks";
import { PixelRunner } from "@/components/PixelRunner";
import { TagButton } from "@/components/TagEditor";
import { UserAvatar, UserIdentity } from "@/components/UserIdentity";
import { VibeCodeDialog } from "@/components/VibeCodeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectionPill } from "@/components/ui/selection-pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Contributor, useContributors } from "@/hooks/useContributors";
import { usePrototypes } from "@/hooks/usePrototypes";
import { startLibraryVisit, unreadCount } from "@/lib/activity";
import { isDemoMode } from "@/lib/demoMode";
import { detectPlatform, opensInNewTabOnly } from "@/lib/platforms";
import { displayName } from "@/lib/names";
import { prototypeTags, tagInfo } from "@/lib/tags";
import type { PrototypeSummary } from "@/lib/types";
import { SignIn } from "@/pages/SignIn";
import { ViewerPage } from "@/pages/ViewerPage";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/p/:prototypeId" element={<ProtectedRoute><ViewerPage /></ProtectedRoute>} />
      </Routes>
      <Toaster />
    </div>
  );
}

function TopBar() {
  const { profile, user, signOut } = useAuth();
  const me = profile?.name ?? user?.email ?? "Member";

  return (
    <header className="flex h-16 items-center justify-between border-b-2 border-carbon-2 bg-abyss-0 px-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2">
          <AppMark />
          <span className="pixel-cursor whitespace-nowrap font-pixel text-base text-marine-8">Alkami Prototypes</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <HowItWorks />
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => void signOut()}>Sign out</Button>
        <UserAvatar id={user?.id} name={me} src={profile?.avatar_url} />
      </div>
    </header>
  );
}

function Library() {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const { prototypes, loading, error, refresh, patch } = usePrototypes();
  const { user } = useAuth();
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [mineOnly, setMineOnly] = useState(false);
  const isMine = (prototype: PrototypeSummary) => Boolean(user && (prototype.owner_id === user.id || prototype.created_by === user.id));
  const matchesQuery = (prototype: PrototypeSummary) => `${prototype.name} ${prototype.url} ${prototype.owner_name} ${prototype.tags.map((id) => tagInfo(id)?.label ?? "").join(" ")}`.toLowerCase().includes(query.toLowerCase());
  // Selecting several tags shows prototypes that have any of them.
  const visible = prototypes
    .filter((prototype) => matchesQuery(prototype) && (!tagFilter.length || prototype.tags.some((id) => tagFilter.includes(id))) && (!mineOnly || isMine(prototype)))
    .sort(librarySorts[sort].compare);
  const tagCounts = new Map(prototypeTags.map((tag) => [tag.id, prototypes.filter((prototype) => matchesQuery(prototype) && prototype.tags.includes(tag.id)).length]));
  const filtering = Boolean(query || tagFilter.length || mineOnly);
  const contributors = useContributors();
  const builders = builderCount(prototypes);

  return (
    <div className="dot-grid min-h-screen bg-carbon-0">
      <TopBar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            {isDemoMode ? <Badge variant="warning" className="mb-2">Local demo mode</Badge> : null}
            <h1 className="text-2xl leading-8 text-marine-8">Prototypes</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <VibeCodeDialog />
            <Button size="lg" className="shrink-0" onClick={() => setAddOpen(true)}><Plus />Add prototype</Button>
          </div>
        </section>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<LayoutGrid />} tone="marine" label="Shared library" value={prototypes.length} unit={prototypes.length === 1 ? "prototype" : "prototypes"} />
          <ContributorsCard contributors={contributors} />
          <StatCard icon={<Hammer />} tone="tiaga" label="Builders" value={builders} unit={builders === 1 ? "person sharing prototypes" : "people sharing prototypes"} />
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-abyss-5" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" className="pl-10" aria-label="Search prototypes" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SelectionPill selected={mineOnly} onClick={() => setMineOnly((value) => !value)} title="Only prototypes you built">Mine</SelectionPill>
              <ToggleGroup type="single" value={sort} onValueChange={(value) => { if (value) setSort(value as LibrarySort); }} aria-label="Sort prototypes" className="rounded-lg bg-carbon-1 p-1">
                {(Object.keys(librarySorts) as LibrarySort[]).map((key) => <ToggleGroupItem key={key} value={key}>{librarySorts[key].label}</ToggleGroupItem>)}
              </ToggleGroup>
              <span className="text-xs text-abyss-5">{visible.length} of {prototypes.length}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by tag">
            <SelectionPill selected={!tagFilter.length} onClick={() => setTagFilter([])}>All</SelectionPill>
            {prototypeTags.map((tag) => { const selected = tagFilter.includes(tag.id); return <SelectionPill key={tag.id} selected={selected} title={tag.hint} onClick={() => setTagFilter((current) => selected ? current.filter((id) => id !== tag.id) : [...current, tag.id])}><span aria-hidden>{tag.emoji}</span>{tag.label}<span className={selected ? "text-marine-5" : "text-abyss-5"}>{tagCounts.get(tag.id)}</span></SelectionPill>; })}
            {filtering ? <Button variant="ghost" onClick={() => { setQuery(""); setTagFilter([]); setMineOnly(false); }}>Clear filters</Button> : null}
          </div>
        </div>

        {loading ? <SkeletonGrid /> : error ? <LibraryError message={error} onRetry={() => void refresh()} /> : visible.length ? <LibraryGroups prototypes={visible} onTagsChange={(id, tags) => patch(id, { tags })} /> : filtering ? <EmptySearch /> : <EmptyLibrary onAdd={() => setAddOpen(true)} />}
      </main>
      <AddPrototypeDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => void refresh()} />
      <PixelRunner />
    </div>
  );
}

type LibrarySort = "updated" | "newest" | "discussed";

// The library's sort orders; each group (MANTL vibe codes, all others) keeps it.
const librarySorts: Record<LibrarySort, { label: string; compare: (left: PrototypeSummary, right: PrototypeSummary) => number }> = {
  updated: { label: "Recently updated", compare: (left, right) => right.updated_at.localeCompare(left.updated_at) },
  newest: { label: "Newest", compare: (left, right) => right.created_at.localeCompare(left.created_at) },
  discussed: { label: "Most discussed", compare: (left, right) => (right.comment_times?.length ?? 0) - (left.comment_times?.length ?? 0) || right.updated_at.localeCompare(left.updated_at) },
};

// The previous library visit in this browser, read once per page load, so
// prototypes added since then get a "New" badge. Null on a first visit.
let visitCutoff: string | null | undefined;
function libraryVisitCutoff() {
  if (visitCutoff === undefined) visitCutoff = startLibraryVisit();
  return visitCutoff;
}

const statTones = {
  marine: "bg-marine-0 text-marine-5",
  desert: "bg-desert-0 text-desert-8",
  tiaga: "bg-tiaga-0 text-tiaga-8",
};

function StatCard({ icon, tone, label, value, unit }: { icon: React.ReactNode; tone: keyof typeof statTones; label: string; value: number; unit: string }) {
  return <Card className="flex items-center gap-4 px-6 py-4 shadow-pixel"><div className={`pixel-notch flex h-10 w-10 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 ${statTones[tone]}`}>{icon}</div><div className="min-w-0"><p className="text-xs text-abyss-5">{label}</p><p className="truncate text-sm text-abyss-7"><span className="text-xl font-bold leading-6 text-abyss-9">{value}</span> {unit}</p></div></Card>;
}

// Looks exactly like the other stat cards (no hover state) on purpose: clicking
// it is a small easter egg that lists everyone who has signed in.
function ContributorsCard({ contributors }: { contributors: Contributor[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-default rounded-lg text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2" aria-label={`${contributors.length} contributors. Show who has signed in`}>
          <StatCard icon={<Users />} tone="desert" label="Contributors" value={contributors.length} unit={contributors.length === 1 ? "person has signed in" : "people have signed in"} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 p-0">
        <div className="border-b border-carbon-3 px-4 py-3"><p className="text-sm font-medium text-abyss-9">Everyone who’s signed in</p><p className="text-xs text-abyss-5">{contributors.length} {contributors.length === 1 ? "person has" : "people have"} explored the library</p></div>
        <ul className="max-h-80 divide-y divide-carbon-2 overflow-y-auto">{contributors.map((person) => <li key={person.id} className="px-4 py-2"><UserIdentity id={person.id} name={person.name} src={person.avatar_url} email={person.email} /></li>)}</ul>
      </PopoverContent>
    </Popover>
  );
}

// The library card is the preview, who built it, its comments (with how many
// are new to you) and views, and the ways in. The description, tags and
// delete live in the viewer.
// Prototypes from Prototyping in MANTL behave a little differently (they open
// in a new tab with handoff and code links, and are archived at the source),
// so they get their own group above everything added by hand.
function LibraryGroups({ prototypes, onTagsChange }: { prototypes: PrototypeSummary[]; onTagsChange: (id: string, tags: string[]) => void }) {
  const mantl = prototypes.filter((prototype) => prototype.source === "mantl");
  const others = prototypes.filter((prototype) => prototype.source !== "mantl");
  return (
    <div className="space-y-10">
      {mantl.length ? <LibraryGroup title="MANTL vibe codes" count={mantl.length} mark={<img src="/mantl-mark.svg" alt="" className="h-8 w-8 [image-rendering:pixelated]" />} onTagsChange={onTagsChange} description="Built in the real Console with Claude Code and shared from Prototyping in MANTL. Each preview is a clickable recording on a private GitHub site, so it opens in a new tab, beside its handoff notes and code." prototypes={mantl} /> : null}
      {others.length ? <LibraryGroup onTagsChange={onTagsChange} title={mantl.length ? "All other prototypes" : "Prototypes"} count={others.length} description="Hosted prototypes added by hand: Claude artifacts, Replit apps and anything else with a link." prototypes={others} /> : null}
    </div>
  );
}

function LibraryGroup({ title, count, description, mark, prototypes, onTagsChange }: { title: string; count: number; description: string; mark?: React.ReactNode; prototypes: PrototypeSummary[]; onTagsChange: (id: string, tags: string[]) => void }) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-start gap-3 border-b-2 border-carbon-2 pb-3">
        {mark ? <div className="pixel-notch flex h-10 w-10 shrink-0 items-center justify-center bg-marine-0">{mark}</div> : null}
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base text-abyss-9">{title}<span className="text-xs font-normal text-abyss-5">{count}</span></h2>
          <p className="mt-0.5 text-sm text-abyss-5">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{prototypes.map((prototype) => <PrototypeCard key={prototype.id} prototype={prototype} onTagsChange={(tags) => onTagsChange(prototype.id, tags)} />)}</div>
    </section>
  );
}

function PrototypeCard({ prototype, onTagsChange }: { prototype: PrototypeSummary; onTagsChange: (tags: string[]) => void }) {
  const { user } = useAuth();
  const platform = detectPlatform(prototype.url, prototype.embed_mode);
  const viewerUrl = `/p/${prototype.id}`;
  const comments = prototype.comment_times?.length ?? prototype.open_comment_count;
  const unread = unreadCount(prototype.id, prototype.comment_times);
  const views = prototype.view_count ?? 0;
  // New since this browser's last visit, unless you added it yourself.
  const cutoff = libraryVisitCutoff();
  const isNew = Boolean(cutoff && prototype.created_at > cutoff && user?.id !== prototype.owner_id && user?.id !== prototype.created_by);
  // Prototypes from Prototyping in MANTL and other private GitHub Pages sites
  // can't be framed: their preview is the gallery thumbnail, the card opens the
  // site, its handoff notes and its code in new tabs, and its name and
  // comments link lead to its page for the conversation.
  const newTabOnly = opensInNewTabOnly(prototype);
  const previewClass = "relative block h-44 overflow-hidden border-b-2 border-carbon-2 bg-carbon-1 focus-visible:outline-none";
  const preview = <>
    {isNew ? <span className="pixel-notch absolute left-3 top-3 z-10 bg-tiaga-6 px-2 py-0.5 font-pixel text-xs text-abyss-0">New</span> : null}
    {prototype.thumbnail_url ? <img src={prototype.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover object-left-top" /> : platform?.external ? <PlatformPreview platform={platform} /> : prototype.embed_mode === "live" && !newTabOnly ? <div className="pointer-events-none absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left scale-[0.3] bg-abyss-0"><iframe title={`${prototype.name} preview`} src={prototype.url} loading="lazy" tabIndex={-1} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" /></div> : <div className="flex h-full items-center justify-center text-xs text-abyss-5">Opens in a new tab</div>}
  </>;

  return (
    <Card className="pixel-lift group flex flex-col overflow-hidden hover:border-marine-2 focus-within:border-marine-2">
      {newTabOnly
        ? <a href={prototype.url} target="_blank" rel="noopener noreferrer" className={previewClass} aria-label={`Open ${prototype.name} in a new tab`}>{preview}</a>
        : <Link to={viewerUrl} className={previewClass} aria-label={`Open ${prototype.name}`}>{preview}</Link>}
      <div className="flex flex-1 flex-col gap-1.5 px-5 pb-4 pt-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="truncate text-base leading-5 text-abyss-9">{newTabOnly ? <Link to={viewerUrl} className="hover:text-marine-5 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2">{prototype.name}</Link> : prototype.name}</h3>
          {newTabOnly ? <div className="shrink-0 [&_button]:min-h-7 [&_button]:px-2 [&_svg]:!h-4 [&_svg]:!w-4"><TagButton prototypeId={prototype.id} tags={prototype.tags} onChange={onTagsChange} /></div> : null}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-abyss-5">
          <UserAvatar id={prototype.owner_id} name={prototype.owner_name} className="h-5 w-5 text-[10px]" />
          <span className="truncate">{displayName(prototype.owner_name)}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{formatRelativeTime(prototype.updated_at)}</span>
          {comments || newTabOnly ? <><span aria-hidden>·</span><Link to={viewerUrl} className="flex shrink-0 items-center gap-1 hover:text-marine-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2" aria-label={`${comments} comments${unread ? `, ${unread} new` : ""}`}><MessageSquare className="h-3.5 w-3.5" />{comments}{unread ? <span className="pixel-notch bg-marine-5 px-1 text-[10px] leading-4 text-abyss-0">{unread} new</span> : null}</Link></> : null}
          {views ? <><span aria-hidden>·</span><span className="flex shrink-0 items-center gap-1" title={`${views} ${views === 1 ? "person has" : "people have"} opened this`}><Eye className="h-3.5 w-3.5" />{views}</span></> : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 [&_svg]:!h-4 [&_svg]:!w-4">
          {newTabOnly ? <NewTabLinks prototype={prototype} /> : <>
            <Button asChild><Link to={viewerUrl}>Open</Link></Button>
            <Button asChild variant="outline"><a href={prototype.url} target="_blank" rel="noopener noreferrer"><ExternalLink />New tab</a></Button>
          </>}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <Card className="flex min-h-64 flex-col items-center justify-center border-dashed border-carbon-3 px-6 py-8 text-center"><div className="pixel-notch mb-4 flex h-10 w-10 items-center justify-center bg-marine-0 text-marine-5 [&_svg]:h-5 [&_svg]:w-5">{icon}</div><h2 className="text-base text-abyss-9">{title}</h2><p className="mt-1 max-w-sm text-sm text-abyss-5">{children}</p>{action ? <div className="mt-4">{action}</div> : null}</Card>;
}

function EmptySearch() {
  return <EmptyState icon={<Search />} title="No prototypes found">Try a different search term or tag.</EmptyState>;
}

function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return <EmptyState icon={<LayoutGrid />} title="Your library is empty" action={<Button size="lg" onClick={onAdd}><Plus />Add your first prototype</Button>}>Add a hosted prototype to give your team a shared place for focused feedback.</EmptyState>;
}

function SkeletonGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item} className="overflow-hidden"><Skeleton className="h-44 rounded-none" /><div className="space-y-2 px-6 py-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56" /><Skeleton className="mt-4 h-8 w-28" /></div></Card>)}</div>;
}

function LibraryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState icon={<RotateCcw />} title="We couldn’t load your prototypes" action={<Button variant="secondary" size="lg" onClick={onRetry}>Try again</Button>}>{message}</EmptyState>;
}

function formatRelativeTime(value: string) {
  const age = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(age / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function builderCount(prototypes: PrototypeSummary[]) {
  return new Set(prototypes.map((prototype) => prototype.owner_id ?? prototype.created_by ?? prototype.owner_slack_id).filter(Boolean)).size;
}

export default App;
