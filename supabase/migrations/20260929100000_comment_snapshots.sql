-- Private screenshot storage for snapshot comments.

insert into storage.buckets (id, name, public)
values ('comment-snapshots', 'comment-snapshots', false)
on conflict (id) do update set public = false;

create policy "Alkami members can upload comment snapshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comment-snapshots'
    and public.is_alkami_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Alkami members can read comment snapshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comment-snapshots'
    and public.is_alkami_member()
  );

create policy "Members can delete their comment snapshots"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'comment-snapshots'
    and owner_id = auth.uid()::text
  );
