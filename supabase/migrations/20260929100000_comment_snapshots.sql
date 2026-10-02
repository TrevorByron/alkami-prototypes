-- Private image storage for comment attachments. Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comment-snapshots', 'comment-snapshots', false, 10485760, array['image/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Alkami members can upload comment snapshots" on storage.objects;
create policy "Alkami members can upload comment snapshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comment-snapshots'
    and public.is_alkami_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Alkami members can read comment snapshots" on storage.objects;
create policy "Alkami members can read comment snapshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comment-snapshots'
    and public.is_alkami_member()
  );

drop policy if exists "Members can delete their comment snapshots" on storage.objects;
create policy "Members can delete their comment snapshots"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'comment-snapshots'
    and owner_id = auth.uid()::text
  );
