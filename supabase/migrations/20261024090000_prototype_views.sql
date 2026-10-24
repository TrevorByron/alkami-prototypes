-- Who has opened each prototype, once per member, so library cards can show
-- "N views". The app upserts a row when someone opens a prototype's page or
-- opens it in a new tab from its card. Safe to re-run.

create table if not exists public.prototype_views (
  prototype_id uuid not null references public.prototypes(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  primary key (prototype_id, viewer_id)
);

alter table public.prototype_views enable row level security;

drop policy if exists "Alkami members can read views" on public.prototype_views;
create policy "Alkami members can read views"
  on public.prototype_views for select to authenticated
  using (public.is_alkami_member());

drop policy if exists "Members record their own views" on public.prototype_views;
create policy "Members record their own views"
  on public.prototype_views for insert to authenticated
  with check (viewer_id = auth.uid() and public.is_alkami_member());

drop policy if exists "Members update their own views" on public.prototype_views;
create policy "Members update their own views"
  on public.prototype_views for update to authenticated
  using (viewer_id = auth.uid() and public.is_alkami_member())
  with check (viewer_id = auth.uid() and public.is_alkami_member());
