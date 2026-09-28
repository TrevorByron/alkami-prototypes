-- Milestone 3: prototypes, comments, replies, and RLS.

create extension if not exists pgcrypto;

create table if not exists public.prototypes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  description text,
  owner_slack_id text not null,
  owner_name text not null,
  slack_channel_id text not null,
  slack_channel_name text not null,
  embed_mode text not null default 'live' check (embed_mode in ('live', 'new_tab')),
  embed_reason text,
  favicon_url text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  prototype_id uuid not null references public.prototypes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) > 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  screen_label text,
  viewport integer check (viewport in (1440, 768, 390)),
  x_pct numeric check (x_pct is null or (x_pct >= 0 and x_pct <= 100)),
  y_pct numeric check (y_pct is null or (y_pct >= 0 and y_pct <= 100)),
  selector text,
  scroll_y numeric,
  snapshot_url text,
  slack_ts text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) > 0),
  slack_ts text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists prototypes_updated_at_idx on public.prototypes(updated_at desc);
create index if not exists comments_prototype_id_idx on public.comments(prototype_id);
create index if not exists replies_comment_id_idx on public.replies(comment_id);

alter table public.prototypes enable row level security;
alter table public.comments enable row level security;
alter table public.replies enable row level security;

create or replace function public.is_prototype_owner(prototype_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.prototypes p
      join public.profiles profile on profile.slack_user_id = p.owner_slack_id
     where p.id = prototype_uuid
       and profile.id = auth.uid()
  );
$$;

revoke all on function public.is_prototype_owner(uuid) from public;
grant execute on function public.is_prototype_owner(uuid) to authenticated;

create policy "Alkami members can read prototypes"
  on public.prototypes for select to authenticated
  using (public.is_alkami_member());

create policy "Alkami members can add prototypes"
  on public.prototypes for insert to authenticated
  with check (created_by = auth.uid() and public.is_alkami_member());

create policy "Alkami members can edit prototypes"
  on public.prototypes for update to authenticated
  using (public.is_alkami_member())
  with check (public.is_alkami_member());

create policy "Alkami members can delete prototypes"
  on public.prototypes for delete to authenticated
  using (public.is_alkami_member());

create policy "Alkami members can read comments"
  on public.comments for select to authenticated
  using (public.is_alkami_member());

create policy "Members can add their own comments"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_alkami_member());

create policy "Authors and owners can update comments"
  on public.comments for update to authenticated
  using (author_id = auth.uid() or public.is_prototype_owner(prototype_id))
  with check (public.is_alkami_member());

create policy "Authors can delete comments"
  on public.comments for delete to authenticated
  using (author_id = auth.uid());

create policy "Alkami members can read replies"
  on public.replies for select to authenticated
  using (public.is_alkami_member());

create policy "Members can add their own replies"
  on public.replies for insert to authenticated
  with check (author_id = auth.uid() and public.is_alkami_member());

create policy "Authors can update replies"
  on public.replies for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.is_alkami_member());

create policy "Authors can delete replies"
  on public.replies for delete to authenticated
  using (author_id = auth.uid());

create or replace function public.touch_prototype_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists prototypes_touch_updated_at on public.prototypes;
create trigger prototypes_touch_updated_at
  before update on public.prototypes
  for each row execute procedure public.touch_prototype_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.replies;
exception when duplicate_object then
  null;
end;
$$;
