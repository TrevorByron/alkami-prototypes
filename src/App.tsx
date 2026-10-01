import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ArrowUpRight, LayoutGrid, Loader2, MessageSquare, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AddPrototypeDialog } from "@/components/AddPrototypeDialog";
import { AppMark } from "@/components/AppMark";
import { UserAvatar } from "@/components/UserIdentity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { usePrototypes } from "@/hooks/usePrototypes";
import { isDemoMode } from "@/lib/demoMode";
import { displayName } from "@/lib/names";
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
    <header className="flex h-16 items-center justify-between border-b border-carbon-3 bg-abyss-0 px-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2">
          <AppMark />
          <span className="text-base font-medium text-abyss-9">Alkami Prototypes</span>
        </Link>
        <Separator className="h-6 w-px" />
        <span className="text-sm text-abyss-5">Team prototype library</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => void signOut()}>Sign out</Button>
        <UserAvatar id={user?.id} name={me} src={profile?.avatar_url} />
      </div>
    </header>
  );
}

function Library() {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { prototypes, loading, error, refresh, remove } = usePrototypes();
  const visible = prototypes.filter((prototype) => `${prototype.name} ${prototype.url} ${prototype.owner_name}`.toLowerCase().includes(query.toLowerCase()));
  const openConversations = openConversationCount(prototypes);
  const contributors = contributorCount(prototypes);

  return (
    <div className="min-h-screen bg-carbon-0">
      <TopBar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            {isDemoMode ? <Badge variant="warning" className="mb-2">Local demo mode</Badge> : null}
            <h1 className="text-2xl font-medium leading-8 text-abyss-9">Prototypes</h1>
            <p className="mt-1 max-w-xl text-sm text-abyss-5">One shared home for prototypes built across Alkami. Explore what teammates are making, leave feedback, and keep ideas moving together.</p>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => setAddOpen(true)}><Plus />Add prototype</Button>
        </section>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<LayoutGrid />} tone="marine" label="Shared library" value={prototypes.length} unit={prototypes.length === 1 ? "prototype" : "prototypes"} />
          <StatCard icon={<MessageSquare />} tone="desert" label="Open conversations" value={openConversations} unit={openConversations === 1 ? "thread waiting for feedback" : "threads waiting for feedback"} />
          <StatCard icon={<Users />} tone="tiaga" label="Team contributors" value={contributors} unit={contributors === 1 ? "builder" : "builders"} />
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-abyss-5" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" className="pl-10" aria-label="Search prototypes" />
          </div>
          <span className="text-xs text-abyss-5">{visible.length} of {prototypes.length} prototypes</span>
        </div>

        {loading ? <SkeletonGrid /> : error ? <LibraryError message={error} onRetry={() => void refresh()} /> : visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((prototype) => <PrototypeCard key={prototype.id} prototype={prototype} onDelete={remove} />)}</div> : query ? <EmptySearch /> : <EmptyLibrary onAdd={() => setAddOpen(true)} />}
      </main>
      <AddPrototypeDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => void refresh()} />
    </div>
  );
}

const statTones = {
  marine: "bg-marine-0 text-marine-5",
  desert: "bg-desert-0 text-desert-8",
  tiaga: "bg-tiaga-0 text-tiaga-8",
};

function StatCard({ icon, tone, label, value, unit }: { icon: React.ReactNode; tone: keyof typeof statTones; label: string; value: number; unit: string }) {
  return <Card className="flex items-center gap-4 px-6 py-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5 ${statTones[tone]}`}>{icon}</div><div className="min-w-0"><p className="text-xs text-abyss-5">{label}</p><p className="truncate text-sm text-abyss-7"><span className="text-xl font-medium leading-6 text-abyss-9">{value}</span> {unit}</p></div></Card>;
}

function PrototypeCard({ prototype, onDelete }: { prototype: PrototypeSummary; onDelete: (id: string) => Promise<string | null> }) {
  const host = (() => { try { return new URL(prototype.url).host; } catch { return prototype.url; } })();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const error = await onDelete(prototype.id);
    setDeleting(false);
    if (error) {
      toast.error(error);
      return;
    }
    setDeleteOpen(false);
    toast.success("Prototype deleted");
  }

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-marine-5 focus-within:border-marine-5">
      <Link to={`/p/${prototype.id}`} className="group block focus-visible:outline-none">
        <div className="relative h-36 overflow-hidden border-b border-carbon-3 bg-carbon-1">
          {prototype.embed_mode === "live" ? <div className="pointer-events-none absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left scale-[0.3] bg-abyss-0"><iframe title={`${prototype.name} preview`} src={prototype.url} loading="lazy" tabIndex={-1} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" /></div> : <div className="flex h-full items-center justify-center text-xs text-abyss-5">Opens in a new tab</div>}
        </div>
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-carbon-3 bg-carbon-0 text-sm font-medium text-abyss-7">{prototype.favicon_url ? <img src={prototype.favicon_url} alt="" className="h-5 w-5" /> : host.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><h3 className="truncate text-base font-medium leading-5 text-abyss-9 group-hover:text-marine-5">{prototype.name}</h3><p className="truncate text-xs text-abyss-5">{host}</p></div>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-abyss-5 group-hover:text-marine-5" />
        </div>
        <div className="px-6 pb-4">
          {prototype.description ? <p className="mb-2 line-clamp-2 text-sm text-abyss-7">{prototype.description}</p> : null}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-carbon-3 pt-4">
            <div className="flex min-w-0 items-center gap-2"><UserAvatar id={prototype.owner_id} name={prototype.owner_name} /><div className="min-w-0"><p className="truncate text-sm font-medium text-abyss-9">{displayName(prototype.owner_name)}</p><p className="text-xs text-abyss-5">Updated {formatRelativeTime(prototype.updated_at)}</p></div></div>
            <div className="flex shrink-0 items-center gap-2"><Badge variant={prototype.open_comment_count ? "default" : "muted"} aria-label={`${prototype.open_comment_count} open comments`}><MessageSquare />{prototype.open_comment_count}</Badge>{prototype.embed_mode === "new_tab" && <Badge variant="muted">New tab only</Badge>}</div>
          </div>
        </div>
      </Link>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild><Button type="button" variant="secondary" size="icon" className="absolute right-4 top-4 z-10 hover:border-chaparral-5 hover:bg-chaparral-0 hover:text-chaparral-5" aria-label={`Delete ${prototype.name}`}><Trash2 /></Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this prototype?</DialogTitle><DialogDescription>This will remove <span className="font-medium text-abyss-9">{prototype.name}</span> from the shared library and delete its comments and replies. This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="secondary" size="lg" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button><Button type="button" variant="danger" size="lg" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}{deleting ? "Deleting…" : "Delete prototype"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EmptyState({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <Card className="flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-8 text-center"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-carbon-1 text-abyss-5 [&_svg]:h-5 [&_svg]:w-5">{icon}</div><h2 className="text-base font-medium text-abyss-9">{title}</h2><p className="mt-1 max-w-sm text-sm text-abyss-5">{children}</p>{action ? <div className="mt-4">{action}</div> : null}</Card>;
}

function EmptySearch() {
  return <EmptyState icon={<Search />} title="No prototypes found">Try a different search term.</EmptyState>;
}

function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return <EmptyState icon={<LayoutGrid />} title="Your library is empty" action={<Button size="lg" onClick={onAdd}><Plus />Add your first prototype</Button>}>Add a hosted prototype to give your team a shared place for focused feedback.</EmptyState>;
}

function SkeletonGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item} className="overflow-hidden"><Skeleton className="h-36 rounded-none" /><div className="flex items-center gap-2 px-6 py-4"><Skeleton className="h-10 w-10" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div></div><div className="px-6 pb-4"><Skeleton className="h-8 w-full" /></div></Card>)}</div>;
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

function openConversationCount(prototypes: PrototypeSummary[]) {
  return prototypes.reduce((total, prototype) => total + prototype.open_comment_count, 0);
}

function contributorCount(prototypes: PrototypeSummary[]) {
  return new Set(prototypes.map((prototype) => prototype.owner_id ?? prototype.created_by ?? prototype.owner_slack_id).filter(Boolean)).size;
}

export default App;
