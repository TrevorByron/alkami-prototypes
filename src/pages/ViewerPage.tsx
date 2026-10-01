import { type DragEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, ChevronDown, ExternalLink, Info, Loader2, LockKeyhole, MessageCircleMore, MessageSquare, Monitor, PanelRight, Paperclip, RotateCcw, Send, Smartphone, ThumbsUp, TrendingUp, MoreVertical, Tablet, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { useCommentThreads } from "@/hooks/useCommentThreads";
import { usePrototype } from "@/hooks/usePrototypes";
import { isDemoMode } from "@/lib/demoMode";
import { addDemoComment, addDemoReply, toggleDemoUpvote, updateDemoComment } from "@/lib/demoStore";
import { notifySlack } from "@/lib/notifySlack";
import { resolveCommentSnapshotUrl, uploadCommentSnapshot } from "@/lib/snapshots";
import { supabase } from "@/lib/supabase";
import type { CommentRecord, Viewport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsoleBadge } from "@/components/ui/console-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppMark } from "@/components/AppMark";
import { UserAvatar, UserIdentity } from "@/components/UserIdentity";
import { displayName } from "@/lib/names";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Filter = "open" | "resolved";
type Sort = "popular" | "newest";
type CommentAttachment = { file: File; dataUrl: string };

const viewportOptions: Array<{ value: Viewport; label: string; icon: typeof Monitor }> = [
  { value: 1440, label: "Desktop", icon: Monitor },
  { value: 768, label: "Tablet", icon: Tablet },
  { value: 390, label: "Mobile", icon: Smartphone },
];

export function ViewerPage() {
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
  const [signInSkipped, setSignInSkipped] = useState<string | null>(null);
  // A callback ref, because the stage only mounts once the prototype has
  // loaded; a mount-time effect would run before it exists and never measure.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    if (!prototype?.url) return;
    setFrameSrc(prototype.url);
  }, [prototypeId, prototype?.url]);

  const showPrototype = () => {
    setSignInSkipped(prototypeId ?? null);
    setRemountKey((value) => value + 1);
    try { window.sessionStorage.setItem(`commentor:signin:${prototypeId}`, "done"); } catch { /* storage unavailable */ }
  };

  const openSignIn = () => {
    if (!prototype) return;
    const popup = window.open(prototype.url, "signin", "popup,width=520,height=720");
    if (!popup) { toast.error("Your browser blocked the sign-in popup."); return; }
    const poll = window.setInterval(() => { if (popup.closed) { window.clearInterval(poll); showPrototype(); toast.success("Prototype frame refreshed."); } }, 400);
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

  if (loading) return <ViewerLoading />;
  if (error || !prototype) return <ViewerError message={error ?? "Prototype not found."} />;

  const scale = Math.min(1, Math.max(0.48, stageSize.width / viewport));

  return <div className="flex h-screen flex-col overflow-hidden bg-carbon-0">
    <header className="flex h-16 items-center justify-between border-b border-carbon-3 bg-abyss-0 px-6"><div className="flex min-w-0 items-center gap-4"><Button aria-label="Back to library" variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft /></Button><Link to="/" className="hidden items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 sm:flex"><AppMark /><span className="text-base font-medium text-abyss-9">Alkami Prototypes</span></Link><Separator className="hidden h-6 w-px sm:block" /><div className="flex min-w-0 items-center gap-2"><UserAvatar id={prototype.owner_id} name={prototype.owner_name} /><div className="min-w-0"><p className="truncate text-sm font-medium text-abyss-9">{displayName(prototype.owner_name)}</p><p className="hidden truncate text-xs text-abyss-5 sm:block">Built by</p></div></div></div><div className="flex items-center gap-2"><Button variant="ghost" className="hidden sm:inline-flex" onClick={() => void signOut()}>Sign out</Button><UserAvatar id={user?.id} name={profile?.name ?? user?.email ?? "Member"} src={profile?.avatar_url} /></div></header>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-carbon-3 bg-abyss-0 px-6 py-2"><div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-base font-medium text-abyss-9">{prototype.name}</h1><ConsoleBadge colorMode={prototype.embed_mode === "live" ? "success" : "info"}>{prototype.embed_mode === "live" ? "Live frame" : "New tab only"}</ConsoleBadge></div><div className="flex flex-wrap items-center justify-end gap-2"><ToggleGroup type="single" value={String(viewport)} onValueChange={(value) => { if (value) setViewport(Number(value) as Viewport); }} className="rounded-lg bg-carbon-1 p-1">{viewportOptions.map(({ value, label, icon: Icon }) => <ToggleGroupItem key={value} value={String(value)} aria-label={label} className="gap-1"><Icon /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{value}</span></ToggleGroupItem>)}</ToggleGroup><Button variant="outline" size="sm" onClick={openSignIn}><LockKeyhole /><span className="hidden sm:inline">Sign in</span></Button><Button variant="outline" size="sm" onClick={openNewTab}><ExternalLink /><span className="hidden sm:inline">Open</span></Button><Button variant="outline" size="icon" aria-label={sidebarOpen ? "Hide comments" : "Show comments"} aria-pressed={sidebarOpen} className={sidebarOpen ? "border-marine-5 bg-marine-0 text-marine-5 hover:bg-marine-0" : undefined} onClick={() => setSidebarOpen((value) => !value)}><PanelRight /></Button></div></div>
    {!helpDismissed ? <div className="relative flex items-center justify-center gap-2 border-b border-marine-1 bg-marine-0 px-12 py-2 text-xs text-marine-8"><Info className="h-4 w-4 shrink-0 text-marine-5" /><span>Seeing a blank frame or a login page? <button className="font-medium text-marine-5 underline underline-offset-2 hover:text-marine-6" onClick={openSignIn}>Sign in</button>, or <button className="font-medium text-marine-5 underline underline-offset-2 hover:text-marine-6" onClick={openNewTab}>open it in a new tab</button>.</span><button aria-label="Dismiss help" className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-marine-8 hover:bg-marine-1" onClick={() => { window.localStorage.setItem(`commentor:help:${prototypeId}`, "dismissed"); setHelpDismissed(true); }}><X className="h-4 w-4" /></button></div> : null}
    <main className="flex min-h-0 flex-1 flex-col lg:flex-row"><div ref={setStage} className="dot-grid relative flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto bg-carbon-0 p-6">{prototype.embed_mode === "new_tab" ? <Card className="mt-10 w-full max-w-lg px-8 py-8 text-center"><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-desert-0 text-desert-8"><ExternalLink className="h-5 w-5" /></div><CardTitle>This prototype opens in a new tab</CardTitle><CardDescription className="mt-1">{prototype.embed_reason ?? "The site does not allow embedding."}</CardDescription><div className="mt-6 flex justify-center gap-2"><Button size="lg" onClick={openNewTab}><ExternalLink />Open prototype</Button><Button variant="secondary" size="lg" onClick={() => setSidebarOpen(true)}><MessageSquare />Add comment</Button></div></Card> : <><div className="relative shrink-0" style={{ width: viewport * scale, height: stageSize.height }}><div className="absolute left-0 top-0 rounded-lg border border-carbon-3 bg-abyss-0 shadow-strato" style={{ width: viewport, height: stageSize.height / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}><iframe key={remountKey} title={prototype.name} src={frameSrc ?? prototype.url} className="block h-full w-full rounded-lg bg-abyss-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" />{needsSignIn(prototype) && signInSkipped !== prototype.id && !readSignInDone(prototype.id) ? <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-abyss-0/50 backdrop-blur-[2px]"><div style={{ transform: `scale(${1 / scale})` }} className="w-full max-w-lg px-6"><Card className="w-full px-8 py-8 text-center shadow-thermo"><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-marine-0 text-marine-5"><LockKeyhole className="h-5 w-5" /></div><CardTitle>Sign in to view this prototype</CardTitle><CardDescription className="mt-1">This prototype needs you to sign in first. A sign-in window will open. Once you’re signed in, close it and the prototype loads here.</CardDescription><div className="mt-6 flex justify-center gap-2"><Button size="lg" onClick={openSignIn}><LockKeyhole />Sign in</Button><Button variant="secondary" size="lg" onClick={openNewTab}><ExternalLink />Open in new tab</Button></div><button type="button" className="mt-4 text-xs text-marine-5 underline underline-offset-2 hover:text-marine-6" onClick={showPrototype}>Already signed in? Show the prototype</button></Card></div></div> : null}</div></div></>}</div>
    {sidebarOpen ? <CommentPanel comments={comments} commentsLoading={commentsLoading} commentsError={commentsError} filter={filter} showResolved={showResolved} body={body} attachment={attachment} saving={saving} onBodyChange={setBody} onAttachmentChange={(file) => void handleAttachmentChange(file)} onClearAttachment={() => setAttachment(null)} onSave={() => void saveComment()} onFilterChange={setFilter} onToggleResolved={() => setShowResolved((value) => !value)} onRefresh={refresh} /> : null}</main>
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
  onRefresh: () => Promise<void>;
};

function CommentPanel({ comments, commentsLoading, commentsError, filter, body, attachment, saving, onBodyChange, onAttachmentChange, onClearAttachment, onSave, onFilterChange, onRefresh }: CommentPanelProps) {
  const { profile, user } = useAuth();
  const [sort, setSort] = useState<Sort>("newest");
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

  const openCount = comments.filter((comment) => comment.status === "open").length;
  const resolvedCount = comments.length - openCount;
  const visible = comments
    .filter((comment) => comment.status === filter)
    .sort((left, right) => (sort === "popular" ? right.upvoters.length - left.upvoters.length : 0) || right.created_at.localeCompare(left.created_at));
  const me = profile?.name ?? user?.email ?? "You";

  return <aside className="flex h-80 w-full shrink-0 flex-col border-t border-carbon-3 bg-abyss-0 lg:h-full lg:w-[26rem] lg:border-l lg:border-t-0">
    <div className="shrink-0 px-6 pt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium text-abyss-9">Comments <span className="text-abyss-5">({comments.length})</span></h2>
        <ToggleGroup type="single" value={sort} onValueChange={(value) => { if (value) setSort(value as Sort); }} aria-label="Sort comments" className="rounded-lg bg-carbon-1 p-1">
          {([["popular", "Popular", TrendingUp], ["newest", "Newest", CalendarDays]] as const).map(([value, label, Icon]) => <ToggleGroupItem key={value} value={value} className="gap-1"><Icon />{label}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>

      <div className="mt-4 flex items-start gap-2">
        <UserAvatar id={user?.id} name={me} src={profile?.avatar_url} />
        <div className={`relative min-w-0 flex-1 rounded-lg border border-carbon-3 bg-abyss-0 transition-shadow focus-within:border-marine-2 focus-within:ring-4 focus-within:ring-marine-2 ${dragActive ? "border-marine-2 ring-4 ring-marine-2" : ""}`} onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <textarea className="block min-h-[2.75rem] w-full resize-none bg-transparent px-4 pt-3 text-sm text-abyss-9 outline-none placeholder:text-abyss-5" value={body} onChange={(event) => onBodyChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && body.trim() && !saving) { event.preventDefault(); onSave(); } }} placeholder="Write a comment…" rows={2} aria-label="Write a comment" />
          {attachment ? <div className="mx-4 mt-2 flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded border border-carbon-3 bg-carbon-0 p-1 pr-2"><img src={attachment.dataUrl} alt="Attachment preview" className="h-8 w-8 rounded object-cover" /><span className="max-w-40 truncate text-xs text-abyss-7">{attachment.file.name}</span><button type="button" aria-label="Remove attachment" className="rounded p-0.5 text-abyss-5 hover:bg-carbon-2 hover:text-abyss-9" onClick={onClearAttachment}><X className="h-4 w-4" /></button></div> : null}
          <div className="flex items-center justify-end gap-1 p-2">
            <label htmlFor="comment-attachment" title="Attach image" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-abyss-5 transition-colors hover:bg-carbon-2 hover:text-abyss-9"><Paperclip className="h-4 w-4" /><span className="sr-only">Attach image</span><input id="comment-attachment" type="file" accept="image/*" className="sr-only" onChange={(event) => { void onAttachmentChange(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            <button type="button" aria-label="Post comment" disabled={!body.trim() || saving} onClick={onSave} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-marine-5 text-abyss-0 transition-colors hover:bg-marine-6 active:bg-marine-7 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 disabled:pointer-events-none disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          {dragActive ? <div className="pointer-events-none absolute inset-1 flex items-center justify-center rounded-md border-2 border-dashed border-marine-5 bg-abyss-0/90 text-xs font-medium text-marine-5">Drop image to attach</div> : null}
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-b border-carbon-3" role="tablist" aria-label="Filter comments">
        {([["open", "Open", openCount], ["resolved", "Resolved", resolvedCount]] as const).map(([value, label, count]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => onFilterChange(value)} className={`-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors focus-visible:outline-none ${filter === value ? "border-marine-5 text-abyss-9" : "border-transparent text-abyss-5 hover:text-abyss-9"}`}>{label}<ConsoleBadge colorMode={filter === value ? "emphasis" : "info"} size="small">{count}</ConsoleBadge></button>)}
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{commentsLoading ? <div className="space-y-4 pt-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : commentsError ? <div className="mt-4 rounded border border-chaparral-2 bg-chaparral-0 p-4 text-sm text-chaparral-6">{commentsError}</div> : <ThreadList comments={visible} onRefresh={onRefresh} />}</div>
  </aside>;
}

function ThreadList({ comments, onRefresh }: { comments: CommentRecord[]; onRefresh: () => Promise<void> }) {
  if (!comments.length) return <div className="flex min-h-48 flex-col items-center justify-center text-center"><div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-carbon-1"><MessageSquare className="h-5 w-5 text-abyss-5" /></div><p className="text-sm font-medium text-abyss-9">No comments here</p><p className="mt-1 text-xs text-abyss-5">New feedback will appear in this view.</p></div>;
  return <div className="divide-y divide-carbon-2">{comments.map((comment) => <CommentCard key={comment.id} comment={comment} onRefresh={onRefresh} />)}</div>;
}

function CommentCard({ comment, onRefresh }: { comment: CommentRecord; onRefresh: () => Promise<void> }) {
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const canResolve = comment.status === "open";
  const [upvoters, setUpvoters] = useState(comment.upvoters);
  const upvoted = Boolean(user && upvoters.includes(user.id));

  useEffect(() => { setUpvoters(comment.upvoters); }, [comment.upvoters]);

  async function toggleUpvote() {
    if (!user) return;
    const previous = upvoters;
    setUpvoters(upvoted ? upvoters.filter((id) => id !== user.id) : [...upvoters, user.id]);
    if (isDemoMode) { toggleDemoUpvote(comment.id); await onRefresh(); return; }
    if (!supabase) return;
    const { error } = upvoted
      ? await supabase.from("comment_upvotes").delete().eq("comment_id", comment.id).eq("user_id", user.id)
      : await supabase.from("comment_upvotes").insert({ comment_id: comment.id, user_id: user.id });
    if (error) { setUpvoters(previous); toast.error(error.message); }
  }

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
    const values = status === "resolved" ? { status, resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_note: null } : { status, resolved_by: null, resolved_at: null, resolution_note: null };
    if (isDemoMode) { updateDemoComment(comment.id, values); setPending(false); toast.success(status === "resolved" ? "Thread resolved" : "Thread reopened"); await onRefresh(); return; }
    if (!supabase) { setPending(false); return; }
    const { error } = await supabase.from("comments").update(values).eq("id", comment.id); setPending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "resolved" ? "Thread resolved" : "Thread reopened"); await onRefresh(); void notifySlack(status === "resolved" ? "resolved" : "reopened", comment.id);
  }

  const authorName = comment.author?.name ?? "Member";

  return <article className="py-4">
    <div className="flex items-start justify-between gap-2">
      <UserIdentity id={comment.author_id} name={authorName} src={comment.author?.avatar_url} email={comment.author?.email} meta={<time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString()}>{formatDate(comment.created_at)}</time>} />
      <div className="flex shrink-0 items-center gap-1">
        {comment.status === "resolved" ? <ConsoleBadge colorMode="success" size="small">Resolved</ConsoleBadge> : null}
        <Popover>
          <PopoverTrigger asChild><button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-abyss-5 transition-colors hover:bg-carbon-2 hover:text-abyss-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2" aria-label="Comment actions"><MoreVertical className="h-4 w-4" /></button></PopoverTrigger>
          <PopoverContent align="end" className="w-44 rounded-lg border-carbon-3 p-1 shadow-strato">{canResolve ? <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-abyss-9 hover:bg-carbon-0" disabled={pending} onClick={() => void updateStatus("resolved")}><Check className="h-4 w-4 text-tiaga-6" />Resolve thread</button> : <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-abyss-9 hover:bg-carbon-0 disabled:opacity-50" disabled={pending} onClick={() => void updateStatus("open")}><RotateCcw className="h-4 w-4 text-abyss-5" />Reopen thread</button>}</PopoverContent>
        </Popover>
      </div>
    </div>
    <div className="pl-10">
      <p className="mt-2 whitespace-pre-wrap text-sm text-abyss-7">{comment.body}</p>
      {snapshotUrl ? <div className="mt-2 overflow-hidden rounded-lg border border-carbon-3 bg-carbon-0"><img src={snapshotUrl} alt="Attached comment image" className="block max-h-56 w-full object-contain" /></div> : null}
      {comment.status === "resolved" && comment.resolution_note ? <p className="mt-2 rounded bg-carbon-0 px-2 py-1 text-xs text-abyss-5">Resolved: {comment.resolution_note}</p> : null}
      <div className="-ml-2 mt-2 flex items-center gap-1">
        <button type="button" className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 ${upvoted ? "text-marine-5" : "text-abyss-7"}`} aria-pressed={upvoted} aria-label={upvoted ? "Remove upvote" : "Upvote"} onClick={() => void toggleUpvote()}><ThumbsUp className={`h-4 w-4 ${upvoted ? "fill-marine-0" : ""}`} />{upvoters.length}</button>
        <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 text-abyss-7" onClick={() => setReplyOpen((value) => !value)}><MessageCircleMore className="h-4 w-4" />Reply</button>
        {comment.replies.length ? <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-carbon-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marine-2 text-marine-5" aria-expanded={repliesExpanded} onClick={() => setRepliesExpanded((value) => !value)}><ChevronDown className={`h-4 w-4 transition-transform ${repliesExpanded ? "rotate-180" : ""}`} />{repliesExpanded ? "Hide" : "See"} {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</button> : null}
      </div>
      {replyOpen ? <div className="mt-2 flex items-end gap-1 rounded-lg border border-carbon-3 p-1 pl-3 focus-within:border-marine-2 focus-within:ring-4 focus-within:ring-marine-2"><textarea autoFocus value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void addReply(); } }} placeholder="Write a reply…" rows={1} className="min-h-[2rem] flex-1 resize-none bg-transparent py-1.5 text-sm text-abyss-9 outline-none placeholder:text-abyss-5" aria-label="Write a reply" /><button type="button" aria-label="Send reply" disabled={!reply.trim() || pending} onClick={() => void addReply()} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-marine-5 text-abyss-0 hover:bg-marine-6 disabled:pointer-events-none disabled:opacity-50"><Send className="h-4 w-4" /></button></div> : null}
      {comment.replies.length && repliesExpanded ? <div className="mt-2 space-y-4 border-l-2 border-carbon-2 pl-4 pt-2">{comment.replies.map((item) => <div key={item.id}><UserIdentity id={item.author_id} name={item.author?.name ?? "Member"} src={item.author?.avatar_url} meta={<time dateTime={item.created_at}>{formatDate(item.created_at)}</time>} /><p className="mt-2 whitespace-pre-wrap pl-10 text-sm text-abyss-7">{item.body}</p></div>)}</div> : null}
    </div>
  </article>;
}

function ViewerLoading() { return <div className="min-h-screen bg-carbon-0"><div className="flex h-16 items-center border-b border-carbon-3 bg-abyss-0 px-6"><div className="flex items-center gap-2"><AppMark /><Skeleton className="h-4 w-32" /></div></div><div className="p-8"><Skeleton className="h-[70vh] w-full" /></div></div>; }
function ViewerError({ message }: { message: string }) { return <div className="min-h-screen bg-carbon-0"><div className="flex h-16 items-center border-b border-carbon-3 bg-abyss-0 px-6"><Link to="/" className="flex items-center gap-2"><AppMark /><span className="text-base font-medium text-abyss-9">Alkami Prototypes</span></Link></div><div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6"><Card className="max-w-md px-8 py-8 text-center"><CardTitle>We couldn’t open this prototype</CardTitle><CardDescription className="mt-1">{message}</CardDescription><Button asChild size="lg" className="mt-6"><Link to="/"><ArrowLeft />Back to library</Link></Button></Card></div></div>; }
// Browsers hide whether a cross-origin frame loaded or was refused, so this
// can't be detected at runtime. check-embed stores this reason when the URL
// redirects to a sign-in provider, and access-controlled GitLab Pages sites
// always do, so treat gitlab.io as one too.
function needsSignIn(prototype: { url: string; embed_reason: string | null }) {
  if (prototype.embed_reason?.startsWith("This URL requires sign-in")) return true;
  try { return new URL(prototype.url).hostname.endsWith(".gitlab.io"); } catch { return false; }
}

function readSignInDone(prototypeId: string) {
  try { return window.sessionStorage.getItem(`commentor:signin:${prototypeId}`) === "done"; } catch { return false; }
}

// "Just now" / "5m ago" for the first day, then a calendar date like "Jun 22, 2025".
function formatDate(value: string) {
  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

