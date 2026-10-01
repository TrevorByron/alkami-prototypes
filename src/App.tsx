import { useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, LayoutGrid, Loader2, MessageSquare, Plus, Search, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AddPrototypeDialog } from "@/components/AddPrototypeDialog";
import { UserAvatar } from "@/components/UserIdentity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function AppMark() {
  return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="h-4 w-4" /></span>;
}

function TopBar({ viewer = false }: { viewer?: boolean }) {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const me = profile?.name ?? user?.email ?? "Member";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/85 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        {viewer ? <Button aria-label="Back to library" variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button> : null}
        <Link to="/" className="group flex items-center gap-3">
          <AppMark />
          <span className="text-[15px] font-semibold tracking-tight">Alkami Prototypes</span>
        </Link>
        {!viewer && <><Separator className="mx-2 h-5 w-px" /><span className="text-sm text-muted-foreground">Team prototype library</span></>}
        {viewer && <><Separator className="mx-2 h-5 w-px" /><span className="text-sm text-muted-foreground">Reviewing prototype</span></>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="hidden text-muted-foreground sm:flex" onClick={() => void signOut()}>Sign out</Button>
        <UserAvatar id={user?.id} name={me} src={profile?.avatar_url} className="ml-1" />
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
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2"><Badge variant="muted" className="gap-1.5 bg-indigo-50 text-indigo-700"><LayoutGrid className="h-3.5 w-3.5" />Workspace</Badge>{isDemoMode ? <Badge variant="outline" className="border-amber-300 text-amber-700">Local demo mode</Badge> : null}</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Alkami Prototypes</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">One shared home for prototypes built across Alkami. Explore what teammates are making, leave feedback, and keep ideas moving together.</p>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add prototype</Button>
        </section>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Card className="bg-card/70"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><LayoutGrid className="h-4 w-4" /></div><div><p className="text-sm font-medium">Shared library</p><p className="text-xs text-muted-foreground">{prototypes.length} {prototypes.length === 1 ? "prototype" : "prototypes"} from the team</p></div></CardContent></Card>
          <Card className="bg-card/70"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><MessageSquare className="h-4 w-4" /></div><div><p className="text-sm font-medium">Open conversations</p><p className="text-xs text-muted-foreground">{openConversations} {openConversations === 1 ? "thread" : "threads"} waiting for feedback</p></div></CardContent></Card>
          <Card className="bg-card/70"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Users className="h-4 w-4" /></div><div><p className="text-sm font-medium">Team contributors</p><p className="text-xs text-muted-foreground">{contributors} {contributors === 1 ? "builder" : "builders"} sharing ideas</p></div></CardContent></Card>
        </div>

        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the shared library" className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{visible.length} of {prototypes.length} prototypes</span>
        </div>

        {loading ? <SkeletonGrid /> : error ? <LibraryError message={error} onRetry={() => void refresh()} /> : visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((prototype) => <PrototypeCard key={prototype.id} prototype={prototype} onDelete={remove} />)}</div> : query ? <EmptySearch /> : <EmptyLibrary onAdd={() => setAddOpen(true)} />}
      </main>
      <AddPrototypeDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => void refresh()} />
    </div>
  );
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
    <Card className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-indigo-100/40">
      <Link to={`/p/${prototype.id}`} className="group block">
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="relative h-36 overflow-hidden border-b bg-muted">
          {prototype.embed_mode === "live" ? <div className="pointer-events-none absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left scale-[0.3] bg-white"><iframe title={`${prototype.name} preview`} src={prototype.url} loading="lazy" tabIndex={-1} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" /></div> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Opens in a new tab</div>}
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted text-sm font-semibold">{prototype.favicon_url ? <img src={prototype.favicon_url} alt="" className="h-5 w-5" /> : host.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0"><CardTitle className="truncate text-base">{prototype.name}</CardTitle><CardDescription className="mt-1 truncate">{host}</CardDescription></div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent>
          {prototype.description ? <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{prototype.description}</p> : null}
          <div className="flex items-center justify-between border-t pt-4 text-sm">
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><UserAvatar id={prototype.owner_id} name={prototype.owner_name} /><span className="truncate">Built by {displayName(prototype.owner_name)}</span></div>
            <div className="flex shrink-0 items-center gap-2"><Badge variant={prototype.open_comment_count ? "default" : "muted"} className="gap-1" aria-label={`${prototype.open_comment_count} open comments`}><MessageSquare className="h-3 w-3" />{prototype.open_comment_count}</Badge>{prototype.embed_mode === "new_tab" && <Badge variant="outline">New tab only</Badge>}</div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Updated {formatRelativeTime(prototype.updated_at)}</p>
        </CardContent>
      </Link>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild><Button type="button" variant="secondary" size="icon" className="absolute right-4 top-6 z-10 h-8 w-8 border bg-background/90 shadow-sm backdrop-blur hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${prototype.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this prototype?</DialogTitle><DialogDescription>This will remove <span className="font-medium text-foreground">{prototype.name}</span> from the shared library and delete its comments and replies. This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button><Button type="button" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deleting ? "Deleting…" : "Delete prototype"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EmptySearch() {
  return <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div><h2 className="font-medium">No prototypes found</h2><p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p></CardContent></Card>;
}

function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Sparkles className="h-5 w-5" /></div><h2 className="font-medium">Your review library is empty</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">Add a hosted prototype to give your team a shared place for focused feedback.</p><Button className="mt-5" onClick={onAdd}><Plus className="h-4 w-4" />Add your first prototype</Button></CardContent></Card>;
}

function SkeletonGrid() {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item} className="overflow-hidden"><Skeleton className="h-2 rounded-none" /><Skeleton className="h-36 rounded-none" /><CardHeader><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div></div></CardHeader><CardContent><Skeleton className="h-9 w-full" /><Skeleton className="mt-4 h-3 w-24" /></CardContent></Card>)}</div>;
}

function LibraryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><h2 className="font-medium">We couldn’t load your prototypes</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p><Button variant="outline" className="mt-5" onClick={onRetry}>Try again</Button></CardContent></Card>;
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

/* Legacy viewer shell retained in history; the functional viewer lives in ViewerPage.tsx.
function Viewer() {
  const { prototypeId } = useParams();
  const [mode, setMode] = useState<"browse" | "comment">("browse");
  const name = prototypeId === "treasury-dashboard" ? "Treasury dashboard" : "Prototype preview";

  return (
    <div className="min-h-screen bg-background">
      <TopBar viewer />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3 md:px-8">
          <div className="flex items-center gap-3"><h1 className="font-medium">{name}</h1><Badge variant="muted" className="hidden sm:inline-flex">Draft</Badge></div>
          <div className="flex items-center gap-2"><div className="flex rounded-lg border bg-muted p-1 text-xs"><button className="rounded-md bg-card px-3 py-1.5 font-medium shadow-sm">Browse</button><button className="rounded-md px-3 py-1.5 text-muted-foreground">Comment</button></div><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" />Open in new tab</Button></div>
        </div>
        <div className="border-b bg-accent/45 px-5 py-2.5 text-center text-xs text-accent-foreground md:px-8">Seeing a blank frame or a login page? <button className="font-semibold underline underline-offset-2">Sign in</button>, or open in a new tab.</div>
        <div className="dot-grid flex flex-1 items-center justify-center p-5 md:p-10">
          <Card className="w-full max-w-4xl overflow-hidden border-2 border-dashed bg-card/90">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><span className="text-xs text-muted-foreground">{name.toLowerCase().replaceAll(" ", "-")}.vercel.app</span><div className="w-12" /></div>
            <CardContent className="flex min-h-[24rem] flex-col items-center justify-center text-center md:min-h-[32rem]"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Check className="h-6 w-6" /></div><CardTitle className="text-xl">Viewer shell is ready</CardTitle><CardDescription className="mt-2 max-w-md">The live prototype frame, pinned comments, and review thread will land in the next milestones.</CardDescription><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => setMode(mode === "browse" ? "comment" : "browse")} variant={mode === "comment" ? "default" : "outline"}><MessageSquare className="h-4 w-4" />{mode === "comment" ? "Comment mode on" : "Try comment mode"}</Button><Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" />Desktop 1440</Button></div></CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
*/

export default App;
