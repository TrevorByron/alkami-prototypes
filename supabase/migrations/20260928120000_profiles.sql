-- Milestone 2: Slack workspace membership and profiles.
-- Before applying this migration, create a Supabase Vault secret named
-- ALLOWED_SLACK_TEAM_ID containing the Alkami Slack team ID.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slack_user_id text not null unique,
  team_id text not null,
  name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.is_alkami_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
  );
$$;

revoke all on function public.is_alkami_member() from public;
grant execute on function public.is_alkami_member() to authenticated;

create policy "Alkami members can read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_alkami_member());

create policy "Members can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.is_alkami_member())
  with check (id = auth.uid() and public.is_alkami_member());

create or replace function public.handle_new_slack_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  team_id text;
  slack_user_id text;
  display_name text;
  avatar_url text;
  allowed_team_id text;
begin
  team_id := coalesce(
    nullif(metadata ->> 'team_id', ''),
    nullif(metadata ->> 'teamId', ''),
    nullif(metadata ->> 'https://slack.com/team_id', ''),
    nullif(metadata ->> 'https://slack.com/teamId', '')
  );
  slack_user_id := coalesce(
    nullif(metadata ->> 'slack_user_id', ''),
    nullif(metadata ->> 'user_id', ''),
    nullif(metadata ->> 'userId', ''),
    nullif(metadata ->> 'https://slack.com/user_id', ''),
    nullif(metadata ->> 'https://slack.com/userId', '')
  );
  display_name := coalesce(
    nullif(metadata ->> 'name', ''),
    nullif(metadata ->> 'display_name', ''),
    nullif(metadata ->> 'real_name', ''),
    new.email,
    'Slack member'
  );
  avatar_url := coalesce(
    nullif(metadata ->> 'avatar_url', ''),
    nullif(metadata ->> 'picture', ''),
    nullif(metadata ->> 'image_192', '')
  );

  -- Vault keeps the workspace ID server-side. The fallback is useful for local
  -- Supabase projects where Vault is unavailable; it is never client-controlled.
  begin
    select decrypted_secret
      into allowed_team_id
      from vault.decrypted_secrets
     where name = 'ALLOWED_SLACK_TEAM_ID'
     limit 1;
  exception when undefined_table then
    allowed_team_id := current_setting('app.settings.allowed_slack_team_id', true);
  end;

  if allowed_team_id is null or btrim(allowed_team_id) = '' then
    raise exception 'ALLOWED_SLACK_TEAM_ID is not configured';
  end if;

  if team_id is null or team_id <> allowed_team_id then
    raise exception 'Only Alkami Slack members can use this';
  end if;

  if slack_user_id is null then
    raise exception 'Slack user ID is missing from the identity claims';
  end if;

  insert into public.profiles (id, slack_user_id, team_id, name, avatar_url, email)
  values (new.id, slack_user_id, team_id, display_name, avatar_url, new.email)
  on conflict (id) do update set
    slack_user_id = excluded.slack_user_id,
    team_id = excluded.team_id,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke all on function public.handle_new_slack_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_slack_user();
