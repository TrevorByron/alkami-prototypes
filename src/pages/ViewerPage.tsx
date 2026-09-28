import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, CircleHelp, Eye, EyeOff, ExternalLink, Loader2, MessageCircle, MessageSquare, Monitor, Moon, PanelRight, RotateCcw, Send, Smartphone, Sparkles, Sun, Tablet, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { useCommentThreads } from "@/hooks/useCommentThreads";
import { usePrototype } from "@/hooks/usePrototypes";
import { isDemoMode } from "@/lib/demoMode";
import { addDemoComment, addDemoReply, updateDemoComment } from "@/lib/demoStore";
import { notifySlack } from "@/lib/notifySlack";
import { navigationMessageType, normalizePageUrl } from "@/lib/pageIdentity";
import { supabase } from "@/lib/supabase";
import type { CommentRecord, Viewport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Theme = "light" | "dark";
type Mode = "browse" | "comment";
type Filter = "open" | "resolved";
type FrameContext = { scrollY: number; selector: string | null };
type ComposerState = { xPct: number | null; yPct: number | null; left: number; top: number; context: FrameContext };

const viewportOptions: Array<{ value: Viewport; label: string; icon: typeof Monitor }> = [
  { value: 1440, label: "Desktop", icon: Monitor },
  { value: 768, label: "Tablet", icon: Tablet },
  { value: 390, label: "Mobile", icon: Smartphone },
];

export function ViewerPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { prototypeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, signOut } = useAuth();
  const { prototype, loading, error } = usePrototype(prototypeId);
  const { comments, loading: commentsLoading, error: commentsError, refresh } = useCommentThreads(prototypeId);
  const [viewport, setViewport] = useState<Viewport>(1440);
  const [mode, setMode] = useState<Mode>("browse");
  const [filter, setFilter] = useState<Filter>("open");
  const [showResolved, setShowResolved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("comment"));
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [body, setBody] = useState("");
  const [screenLabel, setScreenLabel] = useState(() => window.localStorage.getItem("commentor:last-screen-label") ?? "");
  const [saving, setSaving] = useState(false);
  const [remountKey, setRemountKey] = useState(0);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [frameContext, setFrameContext] = useState<FrameContext>({ scrollY: 0, selector: null });
  const [helpDismissed, setHelpDismissed] = useState(() => window.localStorage.getItem(`commentor:help:${prototypeId}`) === "dismissed");
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pageUrlRef = useRef<string | null>(null);
  const [stageWidth, setStageWidth] = useState(1200);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const setActivePage = useCallback((nextPageUrl: string, preserveSelection = false) => {
    const previousPageUrl = pageUrlRef.current;
    if (previousPageUrl === nextPageUrl) return;
    pageUrlRef.current = nextPageUrl;
    setPageUrl(nextPageUrl);
    if (previousPageUrl && !preserveSelection) {
      setSelectedId(null);
      setPulseId(null);
      setComposer(null);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("comment");
        return next;
      }, { replace: true });
    }
  }, [setSearchParams]);

  const restoreFrameContext = useCallback((comment: CommentRecord) => {
    if (!iframeRef.current) return;
    const message = { type: "commentor:restore", url: comment.page_url, scrollY: comment.scroll_y ?? 0, selector: comment.selector };
    try {
      const frameWindow = iframeRef.current.contentWindow;
      const frameDocument = iframeRef.current.contentDocument;
      const target = comment.selector ? frameDocument?.querySelector(comment.selector) : null;
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "auto" });
      } else {
        frameWindow?.scrollTo({ top: comment.scroll_y ?? 0, behavior: "auto" });
      }
      frameWindow?.postMessage(message, "*");
    } catch {
      // A cross-origin prototype can restore its own context through the bridge.
      iframeRef.current.contentWindow?.postMessage(message, "*");
    }
  }, []);

  useEffect(() => {
    if (!prototype?.url) return;
    const initialPageUrl = normalizePageUrl(prototype.url, prototype.url);
    pageUrlRef.current = initialPageUrl;
    setPageUrl(initialPageUrl);
    setFrameSrc(prototype.url);
  }, [prototypeId, prototype?.url]);

  useEffect(() => {
    if (!prototype?.url) return;
    const handleNavigationMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === navigationMessageType && typeof event.data.url === "string") {
        setActivePage(normalizePageUrl(event.data.url, prototype.url));
      }
      if (event.data?.type === "commentor:context") {
        if (typeof event.data.url === "string") setActivePage(normalizePageUrl(event.data.url, prototype.url));
        setFrameContext({
          scrollY: typeof event.data.scrollY === "number" ? event.data.scrollY : 0,
          selector: typeof event.data.selector === "string" ? event.data.selector : null,
        });
      }
    };
    window.addEventListener("message", handleNavigationMessage);
    return () => window.removeEventListener("message", handleNavigationMessage);
  }, [prototype?.url, setActivePage]);

  const handleFrameLoad = () => {
    if (!prototype?.url || !iframeRef.current) return;
    try {
      const loadedUrl = iframeRef.current.contentWindow?.location.href;
      if (loadedUrl) setActivePage(normalizePageUrl(loadedUrl, prototype.url));
      const commentId = searchParams.get("comment");
      const comment = comments.find((item) => item.id === commentId);
      if (comment) window.setTimeout(() => restoreFrameContext(comment), 0);
    } catch {
      // Cross-origin frames must report SPA navigation with the postMessage hook.
      const commentId = searchParams.get("comment");
      const comment = comments.find((item) => item.id === commentId);
      if (comment) window.setTimeout(() => restoreFrameContext(comment), 0);
    }
  };

  useEffect(() => {
    const commentId = searchParams.get("comment");
    if (!commentId) return;
    const comment = comments.find((item) => item.id === commentId);
    if (!comment) return;
    const commentPageUrl = normalizePageUrl(comment.page_url ?? prototype?.url, prototype?.url ?? "");
    if (commentPageUrl && commentPageUrl !== pageUrl) {
      setFrameSrc(comment.page_url ?? prototype?.url ?? null);
      setActivePage(commentPageUrl, true);
    }
    setSelectedId(comment.id); setSidebarOpen(true);
    if (comment.viewport) setViewport(comment.viewport);
    setPulseId(comment.id);
    const timeout = window.setTimeout(() => setPulseId(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [comments, pageUrl, prototype?.url, searchParams, setActivePage]);

  useEffect(() => {
    const comment = comments.find((item) => item.id === selectedId);
    if (!comment) return;
    const timeout = window.setTimeout(() => restoreFrameContext(comment), 0);
    return () => window.clearTimeout(timeout);
  }, [comments, pageUrl, restoreFrameContext, selectedId]);

  const selectComment = (comment: CommentRecord) => {
    setSelectedId(comment.id); setSidebarOpen(true);
    if (comment.viewport) setViewport(comment.viewport);
    const commentPageUrl = normalizePageUrl(comment.page_url ?? prototype?.url, prototype?.url ?? "");
    if (commentPageUrl && commentPageUrl !== pageUrl) {
      setFrameSrc(comment.page_url ?? prototype?.url ?? null);
      setActivePage(commentPageUrl, true);
    }
    const next = new URLSearchParams(searchParams); next.set("comment", comment.id); setSearchParams(next, { replace: true });
    window.setTimeout(() => restoreFrameContext(comment), 0);
  };

  const openSignIn = () => {
    if (!prototype) return;
    const popup = window.open(prototype.url, "signin", "popup,width=520,height=720");
    if (!popup) { toast.error("Your browser blocked the sign-in popup."); return; }
    const poll = window.setInterval(() => { if (popup.closed) { window.clearInterval(poll); setRemountKey((value) => value + 1); toast.success("Prototype frame refreshed."); } }, 400);
  };

  const openNewTab = () => { if (prototype) window.open(prototype.url, "_blank", "noopener,noreferrer"); };

  const openComposer = (event: MouseEvent<HTMLButtonElement>) => {
    if (mode !== "comment") return;
    const rect = event.currentTarget.getBoundingClientRect();
    let context = frameContext;
    try {
      const frame = iframeRef.current;
      const frameRect = frame?.getBoundingClientRect();
      const frameDocument = frame?.contentDocument;
      const frameWindow = frame?.contentWindow;
      if (frame && frameRect && frameDocument && frameWindow) {
        const x = (event.clientX - frameRect.left) * (frame.clientWidth / frameRect.width);
        const y = (event.clientY - frameRect.top) * (frame.clientHeight / frameRect.height);
        const element = frameDocument.elementFromPoint(x, y);
        context = { scrollY: frameWindow.scrollY, selector: element ? cssSelector(element) : null };
      }
    } catch {
      // Cross-origin prototypes can provide this context through postMessage.
    }
    setFrameContext(context);
    setComposer({ xPct: ((event.clientX - rect.left) / rect.width) * 100, yPct: ((event.clientY - rect.top) / rect.height) * 100, left: event.clientX - rect.left, top: event.clientY - rect.top, context });
    setBody("");
  };

  const openGeneralComposer = () => { setMode("comment"); setComposer({ xPct: null, yPct: null, left: 24, top: 24, context: frameContext }); setBody(""); };

  const saveComment = async () => {
    if (!user || !prototypeId || !body.trim()) return;
    setSaving(true);
    if (isDemoMode) {
      addDemoComment({ prototype_id: prototypeId, body: body.trim(), page_url: pageUrl ?? normalizePageUrl(prototype?.url, prototype?.url ?? ""), screen_label: screenLabel.trim() || null, viewport, x_pct: composer?.xPct ?? null, y_pct: composer?.yPct ?? null, selector: composer?.context.selector ?? null, scroll_y: composer?.context.scrollY ?? 0 });
      setSaving(false); if (screenLabel.trim()) window.localStorage.setItem("commentor:last-screen-label", screenLabel.trim());
      setComposer(null); setBody(""); toast.success("Comment added"); await refresh(); return;
    }
    if (!supabase) { setSaving(false); return; }
    const { data: inserted, error: insertError } = await supabase.from("comments").insert({ prototype_id: prototypeId, author_id: user.id, body: body.trim(), page_url: pageUrl ?? normalizePageUrl(prototype?.url, prototype?.url ?? ""), screen_label: screenLabel.trim() || null, viewport, x_pct: composer?.xPct ?? null, y_pct: composer?.yPct ?? null, selector: composer?.context.selector ?? null, scroll_y: composer?.context.scrollY ?? 0 }).select("id").single();
    setSaving(false);
    if (insertError) { toast.error(insertError.message); return; }
    if (screenLabel.trim()) window.localStorage.setItem("commentor:last-screen-label", screenLabel.trim());
    setComposer(null); setBody(""); toast.success("Comment added"); await refresh(); if (inserted?.id) void notifySlack("comment", inserted.id);
  };

  if (loading) return <ViewerLoading theme={theme} onToggleTheme={onToggleTheme} />;
  if (error || !prototype) return <ViewerError theme={theme} onToggleTheme={onToggleTheme} message={error ?? "Prototype not found."} />;

  const scale = Math.min(1, Math.max(0.48, (stageWidth - 48) / viewport));
  const currentPageUrl = pageUrl ?? normalizePageUrl(prototype.url, prototype.url);
  const pageComments = comments.filter((comment) => normalizePageUrl(comment.page_url ?? prototype.url, prototype.url) === currentPageUrl);
  const pins = pageComments.filter((comment) => comment.viewport === viewport && comment.x_pct !== null && comment.y_pct !== null && (comment.status === "open" || showResolved));
  const selected = pageComments.find((comment) => comment.id === selectedId) ?? null;
  const userInitials = (profile?.name ?? "Slack member").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="min-h-screen bg-background">
    <header className="flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur md:px-6"><div className="flex min-w-0 items-center gap-3"><Button aria-label="Back to library" variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button><Link to="/" className="hidden items-center gap-2 sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span><span className="text-sm font-semibold">commentor</span></Link><Separator className="mx-1 hidden h-5 w-px sm:block" /><div className="flex min-w-0 items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-secondary text-[10px]">{initials(prototype.owner_name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{prototype.owner_name}</p><p className="hidden truncate text-xs text-muted-foreground sm:block">Prototype owner</p></div></div></div><div className="flex items-center gap-1"><Button aria-label={theme === "light" ? "Use dark mode" : "Use light mode"} variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button><Button variant="ghost" className="hidden gap-2 text-muted-foreground sm:flex"><CircleHelp className="h-4 w-4" />Help</Button><Button variant="ghost" className="hidden text-muted-foreground sm:flex" onClick={() => void signOut()}>Sign out</Button><Avatar className="ml-1 h-8 w-8 border"><AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{userInitials}</AvatarFallback></Avatar></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 md:px-6"><div className="flex min-w-0 items-center gap-3"><span className="truncate text-sm font-medium">{prototype.name}</span><Badge variant={prototype.embed_mode === "live" ? "muted" : "outline"}>{prototype.embed_mode === "live" ? "Live frame" : "New tab only"}</Badge></div><div className="flex flex-wrap items-center justify-end gap-2"><ToggleGroup type="single" value={String(viewport)} onValueChange={(value) => { if (value) setViewport(Number(value) as Viewport); }} className="rounded-lg border bg-muted p-1">{viewportOptions.map(({ value, label, icon: Icon }) => <ToggleGroupItem key={value} value={String(value)} aria-label={label} className="gap-1.5"><Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{value}</span></ToggleGroupItem>)}</ToggleGroup><ToggleGroup type="single" value={mode} onValueChange={(value) => { if (value) setMode(value as Mode); }} className="rounded-lg border bg-muted p-1"><ToggleGroupItem value="browse" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Browse</ToggleGroupItem><ToggleGroupItem value="comment" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Comment</ToggleGroupItem></ToggleGroup><Button variant="outline" size="sm" onClick={openSignIn}><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign in</span></Button><Button variant="outline" size="sm" onClick={openNewTab}><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Open</span></Button><Button variant="outline" size="icon" aria-label="Toggle comments sidebar" onClick={() => setSidebarOpen((value) => !value)}><PanelRight className="h-4 w-4" /></Button></div></div>
    {!helpDismissed ? <div className="relative border-b bg-accent/45 px-10 py-2.5 text-center text-xs text-accent-foreground">Seeing a blank frame or a login page? <button className="font-semibold underline underline-offset-2" onClick={openSignIn}>Sign in</button>, or open in a new tab.<button aria-label="Dismiss help" className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 opacity-70 hover:opacity-100" onClick={() => { window.localStorage.setItem(`commentor:help:${prototypeId}`, "dismissed"); setHelpDismissed(true); }}><X className="h-3.5 w-3.5" /></button></div> : null}
    <main className="flex h-[calc(100vh-8.75rem)] min-h-[34rem]"><div ref={stageRef} className="dot-grid relative flex min-w-0 flex-1 items-start justify-center overflow-auto p-6 md:p-8">{prototype.embed_mode === "new_tab" ? <Card className="mt-10 w-full max-w-lg border-dashed"><CardHeader className="items-center text-center"><div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"><ExternalLink className="h-5 w-5" /></div><CardTitle>This prototype opens in a new tab</CardTitle><CardDescription>{prototype.embed_reason ?? "The site does not allow embedding."}</CardDescription></CardHeader><CardContent className="flex justify-center gap-3"><Button onClick={openNewTab}><ExternalLink className="h-4 w-4" />Open prototype</Button><Button variant="outline" onClick={openGeneralComposer}><MessageSquare className="h-4 w-4" />Add general comment</Button></CardContent></Card> : <div className="relative shrink-0 overflow-visible rounded-lg border bg-white shadow-2xl" style={{ width: `${viewport}px`, height: "calc(100vh - 11.5rem)", transform: `scale(${scale})`, transformOrigin: "top center" }}><iframe ref={iframeRef} key={remountKey} title={prototype.name} src={frameSrc ?? prototype.url} onLoad={handleFrameLoad} className="block h-full w-full rounded-lg bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" />{mode === "comment" ? <button type="button" aria-label="Place comment pin" className="absolute inset-0 z-10 cursor-crosshair" onClick={openComposer} /> : null}{pins.map((pin, index) => <button key={pin.id} type="button" aria-label="Open comment" onClick={() => selectComment(pin)} style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }} className={cn("absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-transform hover:scale-110", pin.status === "resolved" ? "bg-slate-400 text-white" : "bg-primary text-primary-foreground", selectedId === pin.id && "ring-4 ring-primary/25", pulseId === pin.id && "scale-125 animate-pulse")}><span>{index + 1}</span></button>)}{composer ? <Popover open onOpenChange={(open) => { if (!open) setComposer(null); }}><PopoverAnchor asChild><span className="absolute z-30 h-px w-px" style={{ left: composer.left, top: composer.top }} /></PopoverAnchor><PopoverContent side="right" align="start" className="z-50 w-80 p-4"><div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Leave a comment</p><button type="button" onClick={() => setComposer(null)}><X className="h-4 w-4 text-muted-foreground" /></button></div><Input value={screenLabel} onChange={(event) => setScreenLabel(event.target.value)} placeholder="Screen label (optional)" /><Textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} placeholder="What should change?" rows={4} /><Button className="w-full" disabled={!body.trim() || saving} onClick={() => void saveComment()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{saving ? "Saving…" : "Add comment"}</Button></div></PopoverContent></Popover> : null}</div>}</div></main>
    <Sheet modal={false} open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="right" overlay={false} className="w-[min(100%,26rem)] gap-0 p-0 sm:max-w-md"><SheetHeader className="border-b px-5 py-5"><SheetTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" />Threads <Badge variant="muted">{pageComments.length}</Badge></SheetTitle><SheetDescription className="sr-only">Open and resolved review threads for this page.</SheetDescription><div className="mt-4 flex items-center justify-between gap-2"><ToggleGroup type="single" value={filter} onValueChange={(value) => { if (value) setFilter(value as Filter); }} className="rounded-lg border bg-muted p-1"><ToggleGroupItem value="open" className="px-3">Open</ToggleGroupItem><ToggleGroupItem value="resolved" className="px-3">Resolved</ToggleGroupItem></ToggleGroup><Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setShowResolved((value) => !value)}>{showResolved ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{showResolved ? "Hide resolved" : "Show resolved"}</Button></div></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto p-4">{commentsLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : commentsError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{commentsError}</div> : <ThreadList comments={pageComments.filter((comment) => comment.status === filter)} selectedId={selectedId} onSelect={selectComment} />}{selected ? <ThreadDetail comment={selected} onRefresh={refresh} /> : null}</div></SheetContent></Sheet>
  </div>;
}

function ThreadList({ comments, selectedId, onSelect }: { comments: CommentRecord[]; selectedId: string | null; onSelect: (comment: CommentRecord) => void }) {
  if (!comments.length) return <div className="flex min-h-48 flex-col items-center justify-center text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><MessageSquare className="h-4 w-4 text-muted-foreground" /></div><p className="text-sm font-medium">No threads here</p><p className="mt-1 text-xs text-muted-foreground">New feedback will appear in this view.</p></div>;
  return <div className="space-y-2">{comments.map((comment, index) => <button type="button" key={comment.id} onClick={() => onSelect(comment)} className={cn("w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60", selectedId === comment.id && "border-primary/40 bg-accent")}><div className="flex items-start gap-2.5"><Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-secondary text-[10px]">{initials(comment.author?.name ?? "Member")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium">{comment.author?.name ?? "Member"}</span><span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span></div><p className="mt-1 line-clamp-2 text-sm text-foreground/85">{comment.body}</p><div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">{comment.screen_label ? <span>{comment.screen_label}</span> : <span>General</span>}{comment.replies.length ? <span>· {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span> : null}<span className="ml-auto">#{index + 1}</span></div></div></div></button>)}</div>;
}

function ThreadDetail({ comment, onRefresh }: { comment: CommentRecord; onRefresh: () => Promise<void> }) {
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const canResolve = comment.status === "open";

  async function addReply() {
    if (!user || !reply.trim()) return;
    setPending(true);
    if (isDemoMode) { addDemoReply({ comment_id: comment.id, body: reply.trim() }); setPending(false); setReply(""); toast.success("Reply added"); await onRefresh(); return; }
    if (!supabase) { setPending(false); return; }
    const { data: inserted, error } = await supabase.from("replies").insert({ comment_id: comment.id, author_id: user.id, body: reply.trim() }).select("id").single(); setPending(false);
    if (error) { toast.error(error.message); return; }
    setReply(""); toast.success("Reply added"); await onRefresh(); if (inserted?.id) void notifySlack("reply", inserted.id);
  }

  async function updateStatus(status: "open" | "resolved") {
    if (!user) return;
    setPending(true);
    const values = status === "resolved" ? { status, resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_note: note.trim() || null } : { status, resolved_by: null, resolved_at: null, resolution_note: null };
    if (isDemoMode) { updateDemoComment(comment.id, values); setPending(false); setNote(""); toast.success(status === "resolved" ? "Thread resolved" : "Thread reopened"); await onRefresh(); return; }
    if (!supabase) { setPending(false); return; }
    const { error } = await supabase.from("comments").update(values).eq("id", comment.id); setPending(false);
    if (error) { toast.error(error.message); return; }
    setNote(""); toast.success(status === "resolved" ? "Thread resolved" : "Thread reopened"); await onRefresh(); void notifySlack(status === "resolved" ? "resolved" : "reopened", comment.id);
  }

  return <div className="mt-5 border-t pt-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thread</p><Badge variant={comment.status === "open" ? "default" : "muted"}>{comment.status}</Badge></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-sm leading-6">{comment.body}</p><p className="mt-2 text-xs text-muted-foreground">{comment.screen_label ?? "General comment"} · {timeAgo(comment.created_at)}</p>{comment.selector ? <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground" title={comment.selector}>Element: {comment.selector}</p> : null}{comment.scroll_y ? <p className="mt-1 text-[10px] text-muted-foreground">Scroll position saved: {Math.round(comment.scroll_y)}px</p> : null}</div><div className="mt-4 space-y-3">{comment.replies.map((item) => <div key={item.id} className="flex gap-2.5"><Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-secondary text-[10px]">{initials(item.author?.name ?? "Member")}</AvatarFallback></Avatar><div className="min-w-0 flex-1 rounded-lg border px-3 py-2"><div className="flex justify-between gap-2"><span className="text-xs font-medium">{item.author?.name ?? "Member"}</span><span className="text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span></div><p className="mt-1 text-sm leading-5">{item.body}</p></div></div>)}</div><div className="mt-4 space-y-2"><Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" rows={3} /><Button className="w-full" size="sm" disabled={!reply.trim() || pending} onClick={() => void addReply()}><Send className="h-3.5 w-3.5" />Reply</Button></div><div className="mt-4 space-y-2">{canResolve ? <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed? (optional)" rows={2} /> : null}<Button variant={canResolve ? "secondary" : "outline"} className="w-full" size="sm" disabled={pending} onClick={() => void updateStatus(canResolve ? "resolved" : "open")}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : canResolve ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{canResolve ? "Resolve thread" : "Reopen thread"}</Button></div></div>;
}

function ViewerLoading({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) { return <div className="min-h-screen bg-background"><div className="flex h-16 items-center justify-between border-b px-5"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-4 w-32" /></div><Button variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button></div><div className="p-8"><Skeleton className="h-[70vh] w-full" /></div></div>; }
function ViewerError({ theme, onToggleTheme, message }: { theme: Theme; onToggleTheme: () => void; message: string }) { return <div className="min-h-screen bg-background"><div className="flex h-16 items-center justify-between border-b px-5"><Link to="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span><span className="font-semibold">commentor</span></Link><Button variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button></div><div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"><Card className="max-w-md text-center"><CardHeader><CardTitle>We couldn’t open this prototype</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><Button asChild><Link to="/"><ArrowLeft className="h-4 w-4" />Back to library</Link></Button></CardContent></Card></div></div>; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function timeAgo(value: string) { const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${minutes}m`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h`; return `${Math.round(hours / 24)}d`; }
function cssSelector(element: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 8) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const siblings: Element[] = Array.from(parent.children).filter((child: Element) => child.tagName === tag.toUpperCase());
    const suffix = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
    parts.unshift(`${tag}${suffix}`);
    current = parent;
  }
  return parts.join(" > ");
}
