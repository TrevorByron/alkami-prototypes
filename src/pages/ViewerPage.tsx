import { type DragEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, CircleHelp, Eye, EyeOff, ExternalLink, Loader2, MessageCircle, MessageSquare, Monitor, Moon, PanelRight, Paperclip, RotateCcw, Send, Smartphone, Sparkles, Sun, Tablet, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { useCommentThreads } from "@/hooks/useCommentThreads";
import { usePrototype } from "@/hooks/usePrototypes";
import { isDemoMode } from "@/lib/demoMode";
import { addDemoComment, addDemoReply, updateDemoComment } from "@/lib/demoStore";
import { notifySlack } from "@/lib/notifySlack";
import { resolveCommentSnapshotUrl, uploadCommentSnapshot } from "@/lib/snapshots";
import { supabase } from "@/lib/supabase";
import type { CommentRecord, Viewport } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Theme = "light" | "dark";
type Filter = "open" | "resolved";
type CommentAttachment = { file: File; dataUrl: string };

const viewportOptions: Array<{ value: Viewport; label: string; icon: typeof Monitor }> = [
  { value: 1440, label: "Desktop", icon: Monitor },
  { value: 768, label: "Tablet", icon: Tablet },
  { value: 390, label: "Mobile", icon: Smartphone },
];

export function ViewerPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { prototypeId } = useParams();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { prototype, loading, error } = usePrototype(prototypeId);
  const { comments, loading: commentsLoading, error: commentsError, refresh } = useCommentThreads(prototypeId);
  const [viewport, setViewport] = useState<Viewport>(1440);
  const [filter, setFilter] = useState<Filter>("open");
  const [showResolved, setShowResolved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<CommentAttachment | null>(null);
  const [saving, setSaving] = useState(false);
  const [remountKey, setRemountKey] = useState(0);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [helpDismissed, setHelpDismissed] = useState(() => window.localStorage.getItem(`commentor:help:${prototypeId}`) === "dismissed");
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(1200);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!prototype?.url) return;
    setFrameSrc(prototype.url);
  }, [prototypeId, prototype?.url]);

  const openSignIn = () => {
    if (!prototype) return;
    const popup = window.open(prototype.url, "signin", "popup,width=520,height=720");
    if (!popup) { toast.error("Your browser blocked the sign-in popup."); return; }
    const poll = window.setInterval(() => { if (popup.closed) { window.clearInterval(poll); setRemountKey((value) => value + 1); toast.success("Prototype frame refreshed."); } }, 400);
  };

  const openNewTab = () => { if (prototype) window.open(prototype.url, "_blank", "noopener,noreferrer"); };

  const handleAttachmentChange = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Images must be smaller than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ file, dataUrl: String(reader.result) });
    reader.onerror = () => toast.error("The image could not be loaded.");
    reader.readAsDataURL(file);
  };

  const saveComment = async () => {
    if (!user || !prototypeId || !body.trim()) return;
    setSaving(true);
    let snapshotUrl: string | null = attachment?.dataUrl ?? null;
    if (attachment && !isDemoMode) {
      try {
        snapshotUrl = await uploadCommentSnapshot(attachment.file, user.id, prototypeId);
      } catch (uploadError) {
        setSaving(false);
        toast.error(uploadError instanceof Error ? uploadError.message : "The image could not be saved.");
        return;
      }
    }
    if (isDemoMode) {
      addDemoComment({ prototype_id: prototypeId, body: body.trim(), page_url: null, screen_label: null, viewport: null, x_pct: null, y_pct: null, selector: null, scroll_y: null, snapshot_url: snapshotUrl });
      setSaving(false); setAttachment(null); setBody(""); toast.success("Comment added"); await refresh(); return;
    }
    if (!supabase) { setSaving(false); return; }
    const { data: inserted, error: insertError } = await supabase.from("comments").insert({ prototype_id: prototypeId, author_id: user.id, body: body.trim(), page_url: null, screen_label: null, viewport: null, x_pct: null, y_pct: null, selector: null, scroll_y: null, snapshot_url: snapshotUrl }).select("id").single();
    setSaving(false);
    if (insertError) { toast.error(insertError.message); return; }
    setAttachment(null); setBody(""); toast.success("Comment added"); await refresh(); if (inserted?.id) void notifySlack("comment", inserted.id);
  };

  if (loading) return <ViewerLoading theme={theme} onToggleTheme={onToggleTheme} />;
  if (error || !prototype) return <ViewerError theme={theme} onToggleTheme={onToggleTheme} message={error ?? "Prototype not found."} />;

  const scale = Math.min(1, Math.max(0.48, (stageWidth - 48) / viewport));
  const userInitials = (profile?.name ?? "Slack member").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="min-h-screen bg-background">
    <header className="flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur md:px-6"><div className="flex min-w-0 items-center gap-3"><Button aria-label="Back to library" variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button><Link to="/" className="hidden items-center gap-2 sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span><span className="text-sm font-semibold">Alkami Prototypes</span></Link><Separator className="mx-1 hidden h-5 w-px sm:block" /><div className="flex min-w-0 items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-secondary text-[10px]">{initials(prototype.owner_name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{prototype.owner_name}</p><p className="hidden truncate text-xs text-muted-foreground sm:block">Built by</p></div></div></div><div className="flex items-center gap-1"><Button aria-label={theme === "light" ? "Use dark mode" : "Use light mode"} variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button><Button variant="ghost" className="hidden gap-2 text-muted-foreground sm:flex"><CircleHelp className="h-4 w-4" />Help</Button><Button variant="ghost" className="hidden text-muted-foreground sm:flex" onClick={() => void signOut()}>Sign out</Button><Avatar className="ml-1 h-8 w-8 border"><AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{userInitials}</AvatarFallback></Avatar></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 md:px-6"><div className="flex min-w-0 items-center gap-3"><span className="truncate text-sm font-medium">{prototype.name}</span><Badge variant={prototype.embed_mode === "live" ? "muted" : "outline"}>{prototype.embed_mode === "live" ? "Live frame" : "New tab only"}</Badge></div><div className="flex flex-wrap items-center justify-end gap-2"><ToggleGroup type="single" value={String(viewport)} onValueChange={(value) => { if (value) setViewport(Number(value) as Viewport); }} className="rounded-lg border bg-muted p-1">{viewportOptions.map(({ value, label, icon: Icon }) => <ToggleGroupItem key={value} value={String(value)} aria-label={label} className="gap-1.5"><Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{value}</span></ToggleGroupItem>)}</ToggleGroup><Button variant="outline" size="sm" onClick={openSignIn}><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign in</span></Button><Button variant="outline" size="sm" onClick={openNewTab}><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Open</span></Button><Button variant="outline" size="icon" aria-label="Toggle comments sidebar" onClick={() => setSidebarOpen((value) => !value)}><PanelRight className="h-4 w-4" /></Button></div></div>
    {!helpDismissed ? <div className="relative border-b bg-accent/45 px-10 py-2.5 text-center text-xs text-accent-foreground">Seeing a blank frame or a login page? <button className="font-semibold underline underline-offset-2" onClick={openSignIn}>Sign in</button>, or open in a new tab.<button aria-label="Dismiss help" className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 opacity-70 hover:opacity-100" onClick={() => { window.localStorage.setItem(`commentor:help:${prototypeId}`, "dismissed"); setHelpDismissed(true); }}><X className="h-3.5 w-3.5" /></button></div> : null}
    <main className="flex h-[calc(100vh-8.75rem)] min-h-[34rem] flex-col lg:flex-row"><div ref={stageRef} className="dot-grid relative flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto p-6 md:p-8">{prototype.embed_mode === "new_tab" ? <Card className="mt-10 w-full max-w-lg border-dashed"><CardHeader className="items-center text-center"><div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"><ExternalLink className="h-5 w-5" /></div><CardTitle>This prototype opens in a new tab</CardTitle><CardDescription>{prototype.embed_reason ?? "The site does not allow embedding."}</CardDescription></CardHeader><CardContent className="flex justify-center gap-3"><Button onClick={openNewTab}><ExternalLink className="h-4 w-4" />Open prototype</Button><Button variant="outline" onClick={() => setSidebarOpen(true)}><MessageSquare className="h-4 w-4" />Add comment</Button></CardContent></Card> : <div className="relative shrink-0 overflow-visible rounded-lg border bg-white shadow-2xl" style={{ width: `${viewport}px`, height: "calc(100vh - 11.5rem)", transform: `scale(${scale})`, transformOrigin: "top center" }}><iframe key={remountKey} title={prototype.name} src={frameSrc ?? prototype.url} className="block h-full w-full rounded-lg bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" /></div>}</div>
    {sidebarOpen ? <CommentPanel comments={comments} commentsLoading={commentsLoading} commentsError={commentsError} filter={filter} showResolved={showResolved} body={body} attachment={attachment} saving={saving} onBodyChange={setBody} onAttachmentChange={(file) => void handleAttachmentChange(file)} onClearAttachment={() => setAttachment(null)} onSave={() => void saveComment()} onFilterChange={setFilter} onToggleResolved={() => setShowResolved((value) => !value)} onHide={() => setSidebarOpen(false)} onRefresh={refresh} /> : null}</main>
  </div>;
}

type CommentPanelProps = {
  comments: CommentRecord[];
  commentsLoading: boolean;
  commentsError: string | null;
  filter: Filter;
  showResolved: boolean;
  body: string;
  attachment: CommentAttachment | null;
  saving: boolean;
  onBodyChange: (value: string) => void;
  onAttachmentChange: (file: File | undefined) => void;
  onClearAttachment: () => void;
  onSave: () => void;
  onFilterChange: (value: Filter) => void;
  onToggleResolved: () => void;
  onHide: () => void;
  onRefresh: () => Promise<void>;
};

function CommentPanel({ comments, commentsLoading, commentsError, filter, showResolved, body, attachment, saving, onBodyChange, onAttachmentChange, onClearAttachment, onSave, onFilterChange, onToggleResolved, onHide, onRefresh }: CommentPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith("image/")) ?? event.dataTransfer.files[0];
    if (file) void onAttachmentChange(file);
  };

  return <aside className="flex h-80 w-full shrink-0 flex-col border-t bg-card lg:h-full lg:w-[26rem] lg:border-l lg:border-t-0">
    <div className="shrink-0 border-b px-5 py-5">
      <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">Comments</h2><Badge variant="muted">{comments.length}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Share a thought and keep the conversation going.</p></div><Button variant="ghost" size="icon" aria-label="Hide comments" onClick={onHide}><PanelRight className="h-4 w-4" /></Button></div>
      <div className="mt-5"><div className="mb-2 flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="bg-secondary text-[10px]">{initials("You")}</AvatarFallback></Avatar><p className="text-sm font-medium">Add a comment</p></div><div className={`relative rounded-md transition-colors ${dragActive ? "ring-2 ring-primary ring-offset-2" : ""}`} onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}><Textarea className="bg-muted/25" autoFocus={false} value={body} onChange={(event) => onBodyChange(event.target.value)} placeholder="What do you think? Try “This is awesome!”" rows={3} />{dragActive ? <div className="pointer-events-none absolute inset-1 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-background/90 text-xs font-medium text-primary">Drop image to attach</div> : null}</div><div className="mt-3 flex items-center justify-between gap-2"><label htmlFor="comment-attachment" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Paperclip className="h-3.5 w-3.5" />Attach image<input id="comment-attachment" type="file" accept="image/*" className="sr-only" onChange={(event) => { void onAttachmentChange(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>{attachment ? <div className="flex min-w-0 items-center gap-2"><img src={attachment.dataUrl} alt="Attachment preview" className="h-8 w-8 rounded object-cover" /><span className="max-w-28 truncate text-xs text-muted-foreground">{attachment.file.name}</span><button type="button" aria-label="Remove attachment" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClearAttachment}><X className="h-3.5 w-3.5" /></button></div> : <span className="text-[10px] text-muted-foreground">Optional</span>}</div><Button className="mt-3 w-full" disabled={!body.trim() || saving} onClick={onSave}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{saving ? "Posting…" : "Post comment"}</Button></div>
      <div className="mt-4 flex items-center justify-between gap-2"><ToggleGroup type="single" value={filter} onValueChange={(value) => { if (value) onFilterChange(value as Filter); }} className="rounded-lg border bg-muted p-1"><ToggleGroupItem value="open" className="px-3">Open</ToggleGroupItem><ToggleGroupItem value="resolved" className="px-3">Resolved</ToggleGroupItem></ToggleGroup><Button variant="ghost" size="sm" className="gap-1.5" onClick={onToggleResolved}>{showResolved ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{showResolved ? "Hide resolved" : "Show resolved"}</Button></div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4">{commentsLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : commentsError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{commentsError}</div> : <ThreadList comments={comments.filter((comment) => comment.status === filter)} onRefresh={onRefresh} />}</div>
  </aside>;
}

function ThreadList({ comments, onRefresh }: { comments: CommentRecord[]; onRefresh: () => Promise<void> }) {
  if (!comments.length) return <div className="flex min-h-48 flex-col items-center justify-center text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><MessageSquare className="h-4 w-4 text-muted-foreground" /></div><p className="text-sm font-medium">No threads here</p><p className="mt-1 text-xs text-muted-foreground">New feedback will appear in this view.</p></div>;
  return <div className="space-y-5">{comments.map((comment) => <CommentCard key={comment.id} comment={comment} onRefresh={onRefresh} />)}</div>;
}

function CommentCard({ comment, onRefresh }: { comment: CommentRecord; onRefresh: () => Promise<void> }) {
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const canResolve = comment.status === "open";

  useEffect(() => {
    let active = true;
    setSnapshotUrl(null);
    if (!comment.snapshot_url) return () => { active = false; };
    void resolveCommentSnapshotUrl(comment.snapshot_url)
      .then((url) => { if (active) setSnapshotUrl(url); })
      .catch((snapshotError) => { if (active) toast.error(snapshotError instanceof Error ? snapshotError.message : "The snapshot could not be loaded."); });
    return () => { active = false; };
  }, [comment.snapshot_url]);

  async function addReply() {
    if (!user || !reply.trim()) return;
    setPending(true);
    if (isDemoMode) { addDemoReply({ comment_id: comment.id, body: reply.trim() }); setPending(false); setReply(""); setRepliesExpanded(true); toast.success("Reply added"); await onRefresh(); return; }
    if (!supabase) { setPending(false); return; }
    const { data: inserted, error } = await supabase.from("replies").insert({ comment_id: comment.id, author_id: user.id, body: reply.trim() }).select("id").single(); setPending(false);
    if (error) { toast.error(error.message); return; }
    setReply(""); setRepliesExpanded(true); toast.success("Reply added"); await onRefresh(); if (inserted?.id) void notifySlack("reply", inserted.id);
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

  return <article className="border-b pb-5 last:border-0">
    <div className="flex items-start gap-3"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-secondary text-[10px]">{initials(comment.author?.name ?? "Member")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold">{comment.author?.name ?? "Member"}</span><Badge variant={comment.status === "open" ? "default" : "muted"} className="px-1.5 py-0 text-[10px]">{comment.status}</Badge></div><span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span></div><p className="mt-2 text-sm leading-6">{comment.body}</p>{snapshotUrl ? <div className="mt-3 overflow-hidden rounded-lg border bg-muted"><img src={snapshotUrl} alt="Attached comment image" className="block max-h-56 w-full object-contain" /></div> : null}<p className="mt-2 text-[10px] text-muted-foreground">{comment.snapshot_url ? "Image attached" : "Comment"}</p><div className="mt-2 flex items-center gap-1"><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setReplyOpen((value) => !value)}><MessageSquare className="h-3.5 w-3.5" />Reply</Button>{comment.replies.length ? <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground" aria-expanded={repliesExpanded} onClick={() => setRepliesExpanded((value) => !value)}>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${repliesExpanded ? "rotate-180" : ""}`} /></Button> : null}<span className="flex-1" />{canResolve ? <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => setResolveOpen((value) => !value)}>{resolveOpen ? "Cancel" : "Resolve"}</Button> : <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" disabled={pending} onClick={() => void updateStatus("open")}><RotateCcw className="h-3.5 w-3.5" />Reopen</Button>}</div>{replyOpen ? <div className="mt-3 space-y-2"><Textarea autoFocus value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add a reply…" rows={2} /><Button size="sm" disabled={!reply.trim() || pending} onClick={() => void addReply()}><Send className="h-3.5 w-3.5" />Reply</Button></div> : null}{resolveOpen && canResolve ? <div className="mt-3 space-y-2"><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed? (optional)" rows={2} /><Button variant="secondary" size="sm" disabled={pending} onClick={() => void updateStatus("resolved")}><Check className="h-3.5 w-3.5" />Resolve thread</Button></div> : null}{comment.replies.length && repliesExpanded ? <div className="mt-3 space-y-3 border-l-2 pl-3">{comment.replies.map((item) => <div key={item.id} className="flex gap-2.5"><Avatar className="h-6 w-6 shrink-0"><AvatarFallback className="bg-secondary text-[9px]">{initials(item.author?.name ?? "Member")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{item.author?.name ?? "Member"}</span><span className="text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span></div><p className="mt-1 text-sm leading-5">{item.body}</p></div></div>)}</div> : null}</div></div>
  </article>;
}

function ViewerLoading({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) { return <div className="min-h-screen bg-background"><div className="flex h-16 items-center justify-between border-b px-5"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-4 w-32" /></div><Button variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button></div><div className="p-8"><Skeleton className="h-[70vh] w-full" /></div></div>; }
function ViewerError({ theme, onToggleTheme, message }: { theme: Theme; onToggleTheme: () => void; message: string }) { return <div className="min-h-screen bg-background"><div className="flex h-16 items-center justify-between border-b px-5"><Link to="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span><span className="font-semibold">Alkami Prototypes</span></Link><Button variant="ghost" size="icon" onClick={onToggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button></div><div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"><Card className="max-w-md text-center"><CardHeader><CardTitle>We couldn’t open this prototype</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><Button asChild><Link to="/"><ArrowLeft className="h-4 w-4" />Back to library</Link></Button></CardContent></Card></div></div>; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function timeAgo(value: string) { const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${minutes}m`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h`; return `${Math.round(hours / 24)}d`; }
