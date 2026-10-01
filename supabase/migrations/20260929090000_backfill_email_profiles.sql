-- Create profiles for Alkami Auth users that existed before the email-auth
-- trigger was installed. New users are handled by handle_new_auth_user().

do $$
declare
  allowed_email_domain text := 'alkami.com';
begin
  begin
    select decrypted_secret
      into allowed_email_domain
      from vault.decrypted_secrets
     where name = 'ALLOWED_EMAIL_DOMAIN'
     limit 1;
  exception when undefined_table then
    null;
  end;

  allowed_email_domain := lower(coalesce(nullif(btrim(allowed_email_domain), ''), 'alkami.com'));

  insert into public.profiles (id, slack_user_id, team_id, auth_provider, is_active, name, avatar_url, email)
  select
    auth_user.id,
    null,
    null,
    'email',
    true,
    coalesce(nullif(auth_user.raw_user_meta_data ->> 'name', ''), split_part(lower(auth_user.email), '@', 1), 'Alkami member'),
    coalesce(nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''), nullif(auth_user.raw_user_meta_data ->> 'picture', '')),
    lower(btrim(auth_user.email))
  from auth.users auth_user
  where lower(split_part(coalesce(auth_user.email, ''), '@', 2)) = allowed_email_domain
    and not exists (
      select 1
        from public.profiles profile
       where profile.id = auth_user.id
    )
  on conflict (id) do nothing;
end;
$$;
