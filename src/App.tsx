import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, CircleHelp, ExternalLink, LayoutGrid, MessageSquare, Moon, Plus, Search, Sparkles, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Theme = "light" | "dark";

const prototypes = [
  { name: "Treasury dashboard", host: "treasury-preview.vercel.app", owner: "Maya Chen", initials: "MC", comments: 8, updated: "12 min ago", accent: "from-indigo-500 to-violet-500" },
  { name: "Business banking onboarding", host: "onboarding-prototype.netlify.app", owner: "Jordan Lee", initials: "JL", comments: 3, updated: "Yesterday", accent: "from-cyan-500 to-blue-500" },
  { name: "Account insights", host: "account-insights.pages.dev", owner: "Sam Rivera", initials: "SR", comments: 0, updated: "3 days ago", accent: "from-amber-400 to-orange-500", newTab: true },
];

function App() {
  const [theme, setTheme] = useState<Theme>("light");

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <Routes>
        <Route path="/" element={<Library theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} />} />
        <Route path="/p/:prototypeId" element={<Viewer theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} />} />
      </Routes>
    </div>
  );
}

function AppMark() {
  return <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="h-4 w-4" /></span>;
}

function TopBar({ theme, onToggleTheme, viewer = false }: { theme: Theme; onToggleTheme: () => void; viewer?: boolean }) {
  const navigate = useNavigate();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/85 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        {viewer ? <Button aria-label="Back to library" variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button> : null}
        <Link to="/" className="group flex items-center gap-3">
          <AppMark />
          <span className="text-[15px] font-semibold tracking-tight">commentor</span>
        </Link>
        {!viewer && <><Separator className="mx-2 h-5 w-px" /><span className="text-sm text-muted-foreground">Prototype library</span></>}
        {viewer && <><Separator className="mx-2 h-5 w-px" /><span className="text-sm text-muted-foreground">Reviewing prototype</span></>}
      </div>
      <div className="flex items-center gap-2">
        <Button aria-label={theme === "light" ? "Use dark mode" : "Use light mode"} variant="ghost" size="icon" onClick={onToggleTheme}>
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" className="hidden gap-2 text-muted-foreground sm:flex"><CircleHelp className="h-4 w-4" />Help</Button>
        <Avatar className="ml-1 h-8 w-8 border border-border"><AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">TB</AvatarFallback></Avatar>
      </div>
    </header>
  );
}

function Library({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [query, setQuery] = useState("");
  const visible = prototypes.filter((prototype) => `${prototype.name} ${prototype.host} ${prototype.owner}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Badge variant="muted" className="mb-4 gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"><LayoutGrid className="h-3.5 w-3.5" />Workspace</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your prototypes</h1>
            <p className="mt-2 max-w-lg text-muted-foreground">A calm place to review early ideas, leave precise feedback, and keep conversations moving.</p>
          </div>
          <Button size="lg" className="shrink-0"><Plus className="h-4 w-4" />Add prototype</Button>
        </section>

        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{visible.length} of {prototypes.length} prototypes</span>
        </div>

        {visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((prototype) => <PrototypeCard key={prototype.name} prototype={prototype} />)}</div> : <EmptySearch />}
      </main>
    </div>
  );
}

function PrototypeCard({ prototype }: { prototype: (typeof prototypes)[number] }) {
  return (
    <Link to="/p/treasury-dashboard" className="group block">
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-xl group-hover:shadow-indigo-100/40 dark:group-hover:shadow-black/20">
        <div className={`h-2 bg-gradient-to-r ${prototype.accent}`} />
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted text-sm font-semibold">{prototype.host.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0"><CardTitle className="truncate text-base">{prototype.name}</CardTitle><CardDescription className="mt-1 truncate">{prototype.host}</CardDescription></div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border-t pt-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Avatar className="h-7 w-7"><AvatarFallback className="bg-secondary text-[10px]">{prototype.initials}</AvatarFallback></Avatar><span>{prototype.owner}</span></div>
            <div className="flex items-center gap-2"><Badge variant={prototype.comments ? "default" : "muted"} className="gap-1"><MessageSquare className="h-3 w-3" />{prototype.comments}</Badge>{prototype.newTab && <Badge variant="outline">New tab only</Badge>}</div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Updated {prototype.updated}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptySearch() {
  return <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div><h2 className="font-medium">No prototypes found</h2><p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p></CardContent></Card>;
}

function Viewer({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { prototypeId } = useParams();
  const [mode, setMode] = useState<"browse" | "comment">("browse");
  const name = prototypeId === "treasury-dashboard" ? "Treasury dashboard" : "Prototype preview";

  return (
    <div className="min-h-screen bg-background">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} viewer />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3 md:px-8">
          <div className="flex items-center gap-3"><h1 className="font-medium">{name}</h1><Badge variant="muted" className="hidden sm:inline-flex">Draft</Badge></div>
          <div className="flex items-center gap-2"><div className="flex rounded-lg border bg-muted p-1 text-xs"><button className="rounded-md bg-card px-3 py-1.5 font-medium shadow-sm">Browse</button><button className="rounded-md px-3 py-1.5 text-muted-foreground">Comment</button></div><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" />Open in new tab</Button></div>
        </div>
        <div className="border-b bg-accent/45 px-5 py-2.5 text-center text-xs text-accent-foreground md:px-8">Seeing a blank frame or a login page? <button className="font-semibold underline underline-offset-2">Sign in</button>, or open in a new tab.</div>
        <div className="dot-grid flex flex-1 items-center justify-center p-5 md:p-10">
          <Card className="w-full max-w-4xl overflow-hidden border-2 border-dashed bg-card/90">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><span className="text-xs text-muted-foreground">{name.toLowerCase().replaceAll(" ", "-")}.vercel.app</span><div className="w-12" /></div>
            <CardContent className="flex min-h-[24rem] flex-col items-center justify-center text-center md:min-h-[32rem]"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Check className="h-6 w-6" /></div><CardTitle className="text-xl">Viewer shell is ready</CardTitle><CardDescription className="mt-2 max-w-md">The live prototype frame, pinned comments, and review thread will land in the next milestones.</CardDescription><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => setMode(mode === "browse" ? "comment" : "browse")} variant={mode === "comment" ? "default" : "outline"}><MessageSquare className="h-4 w-4" />{mode === "comment" ? "Comment mode on" : "Try comment mode"}</Button><Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" />Desktop 1440</Button></div></CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;
