-- Move access control to Alkami email identity while keeping Slack identity
-- fields available for a future Slack integration.

alter table public.profiles
  alter column slack_user_id drop not null,
  alter column team_id drop not null;

alter table public.profiles
  add column if not exists auth_provider text not null default 'slack',
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add constraint profiles_auth_provider_check check (auth_provider in ('email', 'slack'));

alter table public.prototypes
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

alter table public.prototypes
  alter column owner_slack_id drop not null,
  alter column slack_channel_id drop not null,
  alter column slack_channel_name drop not null;

update public.prototypes prototype
   set owner_id = profile.id
  from public.profiles profile
 where prototype.owner_id is null
   and prototype.owner_slack_id is not null
   and profile.slack_user_id = prototype.owner_slack_id;

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
       and is_active = true
  );
$$;

revoke all on function public.is_alkami_member() from public;
grant execute on function public.is_alkami_member() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_metadata jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  email_address text := lower(btrim(coalesce(new.email, '')));
  email_domain text;
  allowed_email_domain text;
  slack_user_id text;
  team_id text;
  display_name text;
  avatar_url text;
  provider text;
begin
  email_domain := split_part(email_address, '@', 2);
  begin
    select decrypted_secret
      into allowed_email_domain
      from vault.decrypted_secrets
     where name = 'ALLOWED_EMAIL_DOMAIN'
     limit 1;
  exception when undefined_table then
    allowed_email_domain := current_setting('app.settings.allowed_email_domain', true);
  end;
  allowed_email_domain := lower(coalesce(nullif(btrim(allowed_email_domain), ''), 'alkami.com'));

  if email_domain <> allowed_email_domain then
    raise exception 'Only % email addresses can use this', allowed_email_domain;
  end if;

  slack_user_id := coalesce(
    nullif(metadata ->> 'slack_user_id', ''),
    nullif(metadata ->> 'user_id', ''),
    nullif(metadata ->> 'userId', ''),
    nullif(metadata ->> 'https://slack.com/user_id', ''),
    nullif(metadata ->> 'https://slack.com/userId', '')
  );
  team_id := coalesce(
    nullif(metadata ->> 'team_id', ''),
    nullif(metadata ->> 'teamId', ''),
    nullif(metadata ->> 'https://slack.com/team_id', ''),
    nullif(metadata ->> 'https://slack.com/teamId', '')
  );
  display_name := coalesce(
    nullif(metadata ->> 'name', ''),
    nullif(metadata ->> 'display_name', ''),
    nullif(metadata ->> 'real_name', ''),
    split_part(email_address, '@', 1),
    'Alkami member'
  );
  avatar_url := coalesce(
    nullif(metadata ->> 'avatar_url', ''),
    nullif(metadata ->> 'picture', ''),
    nullif(metadata ->> 'image_192', '')
  );
  provider := case when slack_user_id is not null then 'slack' else 'email' end;

  insert into public.profiles (id, slack_user_id, team_id, auth_provider, is_active, name, avatar_url, email)
  values (new.id, slack_user_id, team_id, provider, true, display_name, avatar_url, email_address)
  on conflict (id) do update set
    slack_user_id = excluded.slack_user_id,
    team_id = excluded.team_id,
    auth_provider = excluded.auth_provider,
    is_active = true,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.is_prototype_owner(prototype_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.prototypes prototype
      left join public.profiles slack_profile on slack_profile.slack_user_id = prototype.owner_slack_id
     where prototype.id = prototype_uuid
       and (
         prototype.owner_id = auth.uid()
         or prototype.created_by = auth.uid()
         or slack_profile.id = auth.uid()
       )
  );
$$;

revoke all on function public.is_prototype_owner(uuid) from public;
grant execute on function public.is_prototype_owner(uuid) to authenticated;
