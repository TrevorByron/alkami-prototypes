-- Who has actually signed in (not just requested a link), for the library's
-- Contributors card. auth.users isn't readable from the browser, so this
-- security-definer function exposes only these columns, only to members.
-- Safe to re-run.

create or replace function public.signed_in_members()
returns table (id uuid, name text, email text, avatar_url text, first_signed_in_at timestamptz, last_signed_in_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select profile.id, profile.name, coalesce(profile.email, account.email), profile.avatar_url, coalesce(account.confirmed_at, account.created_at), account.last_sign_in_at
    from public.profiles profile
    join auth.users account on account.id = profile.id
   where public.is_alkami_member()
     and profile.is_active
     and account.last_sign_in_at is not null
   order by coalesce(account.confirmed_at, account.created_at);
$$;

revoke all on function public.signed_in_members() from public;
grant execute on function public.signed_in_members() to authenticated;
