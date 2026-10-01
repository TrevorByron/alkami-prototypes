-- One upvote per member per comment.

create table if not exists public.comment_upvotes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, user_id)
);

alter table public.comment_upvotes enable row level security;

create policy "Alkami members can read upvotes"
  on public.comment_upvotes for select to authenticated
  using (public.is_alkami_member());

create policy "Members can add their own upvotes"
  on public.comment_upvotes for insert to authenticated
  with check (user_id = auth.uid() and public.is_alkami_member());

create policy "Members can remove their own upvotes"
  on public.comment_upvotes for delete to authenticated
  using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.comment_upvotes;
exception when duplicate_object then
  null;
end;
$$;
